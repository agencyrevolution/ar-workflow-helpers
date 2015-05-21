'use strict';

var Q = require('q');
var kafka = require('kafka-node');
var _ = require('lodash');
var uuid = require('node-uuid');

var messageTraceConfig = require('./message-trace');
var logger = require('./logger');
var WorkerLogTrace = require('./worker-log-trace');

let messageStatus = messageTraceConfig.states;


/**
 * Export common methods for consumer and producer
 * @param  {object} config object providing zookeeper, worker, messageTrace configuration
 * @param  {Function} onMessageCallback the callback handling the event when message is fetched
 * @this
 */
module.exports = function(config, onMessageCallback) {
  var zookeeperConfig = config.zookeeper;
  var consumerConfig = config.worker.consumer;
  var messageTracking = config.messageTracking !== undefined ? config.messageTracking : true;
  var retryTopic = config.worker.retryTopic;
  var isRetry = config.isRetry === true;

  var client = new kafka.Client(zookeeperConfig.connectionString, zookeeperConfig.clientId, zookeeperConfig.options);
  var offset = new kafka.Offset(client);
  var consumer = new kafka.Consumer(client, consumerConfig.payloads, consumerConfig.options);
  var producer = new kafka.Producer(client);
  var maxSendMessageCount = config.maxSendMessageCount || 100;

  var self = this;

  /*
   * Get fetch type
   */
  var getFetchType = function(message) {
    return `${message.topic} - Partition ${message.partition}`;
  };


  // maintain list of processing message offset for each topic
  var fetchData = {};
  _.each(config.worker.consumer.payloads, function(payload) {
    var m = {
      topic: payload.topic,
      partition: payload.partition || 0
    };
    fetchData[getFetchType(m)] = [];
  });


  /*
   * Log as format
   */
  var log = function(logLevel, funcName, message, logMessages) {
    logger.logWorker(logLevel, consumerConfig.options.groupId, funcName, message, logMessages);
  };


  /*
   * Ensure producer is ready before sending messages to kafka
   */
  var ensureProducerReady = function(callback) {
    var deferred = Q.defer();

    if (!producer.ready) {
      producer.on('ready', function() {
        logger.verbose('Producer is ready!');
        deferred.resolve(producer);
      });
    } else {
      deferred.resolve(producer);
    }

    return deferred.promise.nodeify(callback);
  };


  /*
   * Fetch current offset
   */
  var fetchCurrentOffset = function(payloads, callback) {
    var deferred = Q.defer();

    offset.fetch(payloads, function(err, data) {
      if (err) {
        logger.error('Offset.fetch(): ', err.stack || err.message || err);
        return deferred.reject(err);
      }
      deferred.resolve(data);
    });

    return deferred.promise.nodeify(callback);
  };


  /*
   * Check if all messages of this fetch proceeed
   */
  var areMessagesProceeded = function() {
    for (var topic in fetchData) {
      if (fetchData[topic].length) {return false;}
    }
    return true;
  };


  /*
   * Log fetch data
   */
  var logFetchData = function() {
    var logStrings = [
      'PROCESSING MESSAGE INFO OF THIS FETCH',
      '---------------------------------------------------------'
    ];
    for (var fetchType in fetchData) {
      logStrings.push(`Topic ${fetchType} - message count : ${fetchData[fetchType].length}`);
    }
    for (var fetchType in fetchData) {
      logStrings.push(`${fetchType} : ${JSON.stringify(fetchData[fetchType])}`);
    }
    logStrings.push('---------------------------------------------------------');
    logger.verbose(logStrings.join('\n'), '\n');
  };


  consumer.on('message', function(message) {

    // pause consumer until all messages of this fetch commited
    consumer.pause();

    try {
      message.size = message.value.length;
      message.value = JSON.parse(message.value);

      var fetchType = getFetchType(message);
      fetchData[fetchType] = _.union(fetchData[fetchType], [
        _.pick(message, ['offset', 'size'])
      ]);
      logFetchData();

      self.track(message.topic, [message.value], messageStatus.fetched);

      onMessageCallback(message);
    } catch (e) {
      self.retryAndCommit(message, e);
    }
  });

  consumer.on('error', function(err) {
    logger.error('consumer.on(err): ', err.stack || err.message || err);
    logger.verbose('Reconnecting...');
  });

  consumer.on('offsetOutOfRange', function(err) {
    logger.error('consumer.on(offsetOutOfRange): ', err.stack || err.message || err);
    self.handleOffsetOutOfRange(err.topic, err.partition);
  });


  /*
   * Consumer commit
   */
  this.commitMessage = function(message, callback) {
    var deferred = Q.defer();

    consumer.commit(true, function(err, data) {
      if (err) {
        log('error', 'commitMessage', message, [err]);
        return deferred.reject(err);
      }

      // commit successfully, update list of processing message offsets
      var fetchType = getFetchType(message);
      fetchData[fetchType] = _.reject(fetchData[fetchType], _.pick(message, ['offset', 'size']));

      // log fetch data
      logFetchData();

      // check if all messages are completed processing, resume consumer for next fetch request
      if (areMessagesProceeded()) {
        logger.info(`All fetched ${message.topic} messages have been committed !`,
                    `Resume consumer to send next fetch request...`,
                    '\n');
        consumer.resume();
      }

      log('verbose', 'commitMessage', message, ['MESSAGE COMMITED']);
      self.track(message.topic, [message.value], messageStatus.committed);
      deferred.resolve(true);

    });

    return deferred.promise.nodeify(callback);
  };


  /*
   * Commit offset
   */
  this.commitOffset = function(message, callback) {
    var deferred = Q.defer();
    var groupId = consumerConfig.options.groupId;
    var payloads = [
      {
        topic: message.topic,
        partition: message.partition,
        offset: message.offset
      }
    ];
    let logStrings = [`groupId: ${groupId}`];

    offset.commit(groupId, payloads, function(err, data) {
      if (err) {
        log('error', 'commitOffset', message, _.union(logStrings, [err.stack || err.messag || err]));
        deferred.reject(err);
      } else {
        log('verbose', 'commitOffset', message, _.union(logStrings, ['OFFSET COMMITTED!']));
        deferred.resolve(data);
      }
    });

    return deferred.promise.nodeify(callback);
  };


  /*
   * Done processing
   */
  this.done = function(message, nextMessageIds) {
    if (!nextMessageIds) {
      nextMessageIds = null;
    }

    // log trace for the message
    message.logTrace && message.logTrace.endSuccess(nextMessageIds);

    this.commitMessage(message, function(err, res) {
      if (err) {
        log('error', 'commitMessage', message, [
          err.stack || err.message || err,
          'Retry in 5 seconds...'
        ]);

        setTimeout(function() {
          self.done(message);
        }, 5000);
      } else {
        self.track(message.topic, [message.value], messageStatus.succeeded, nextMessageIds);
      }
    });
  };


  /*
   * Done processing and commit offset
   */
  this.doneOffset = function(message, nextMessageIds) {
    if (!nextMessageIds) {
      nextMessageIds = null;
    }

    this.commitOffset(message, function(err, res) {
      if (err) {
        log('error', 'doneOffset', message, [
          err.stack || err.message || err,
          'Retry in 5 seconds...'
        ]);

        setTimeout(function() {
          self.doneOffset(message, nextMessageIds);
        }, 5000);
      } else {
        self.track(message.topic, [message.value], messageStatus.succeeded, nextMessageIds);
      }
    });
  };


  /*
   * producer send
   */
  this.sendMessages = function(topic, messages, callback) {

    if (!_.isArray(messages)) {
      messages = [messages];
    }

    // internal log for this function
    var log = function(logLevel, logStrings) {
      var strings = _.union([
        `topic: ${topic}`,
        `message count: ${messages.length}`
      ], logStrings);
      logger.log(logLevel, 'kafkaWorker', 'sendMessages', strings);
    };

    // log
    log('verbose');

    var messageBatches = _.chunk(messages, maxSendMessageCount);

    log('verbose', [`Split into ${messageBatches.length} batches to send`]);

    // parallel tasks
    var tasks = _.map(messageBatches, function(messageBatch) {
      var _deferred = Q.defer();
      var nextMessageIds = [];

      var payloads = [
        {
          topic: topic,
          messages: messageBatch.map(function(msg) {
            if (!msg.createdAt) { msg.createdAt = Date.now(); }
            if (!msg.messageId) { msg.messageId = uuid.v4(); }
            nextMessageIds.push(msg.messageId);
            var strMessage = JSON.stringify(msg);
            if (strMessage.length > 2 * 1024 * 1024) {
              log('warn', [
                'MESSAGE IS TOO BIG! (> 2MB)',
                `message id: ${msg.messageId}`,
                `message size: ${strMessage.length} bytes`
              ]);
            }
            return strMessage;
          })
        }
      ];

      // send a batch of messages
      ensureProducerReady().then(function() {
        producer.send(payloads, function(err, data) {
          if (err) {
            log('error', ['FAILED TO SEND', err.stack || err.message || err]);
            return _deferred.reject(err);
          }

          log('verbose', ['MESSAGE SENT']);
          _deferred.resolve(nextMessageIds);
        });
      });

      return _deferred.promise;
    });

    let deferred = Q.defer();

    Q.all(tasks)
        .then(function(nextMessageIdsList) {
          self.track(topic, messages, messageStatus.sent);
          deferred.resolve(_.flatten(nextMessageIdsList));
        })
        .catch(function(err) {
          deferred.reject(err);
        });

    return deferred.promise.nodeify(callback);
  };


  /*
   * Hanlde retry
   */
  this.retryAndCommit = function(message, err) {
    // log trace for this message
    if (!message.logTrace) { message.logTrace = new WorkerLogTrace(message); }

    let logTrace = message.logTrace;
    logTrace.add('error', 'Unexpected', err.stack || err.message || err);
    logTrace.extendProps({ retryTopic: retryTopic });

    this.sendMessages(retryTopic, [message.value])
        .then(function(res) {
          logTrace.endError(message.nextMessageIds);
          return self.commitMessage(message);
        })

        .catch(function(err) {
          logTrace.add('error', 'kafkaWorker.sendMessages()', `${err.stack || err.message || err}`);
          setTimeout(function() {
            self.retryAndCommit(message);
          }, 5000);
        });
  };


  /*
   * send message to messageTrace topic
   */
  this.track = function(topic, messages, status, nextMessageIds, callback) {
    var deferred = Q.defer();
    var logStrings = [
      'topic: ' + topic,
      'message count: ' + messages.length,
      'status: ' + JSON.stringify(status)
    ];
    logger.log('verbose', 'kafkaWorker', 'track', logStrings);

    if (!messageTracking) {
      return {};
    }

    // only track 'RETRIED' and 'FAILED' status for retry message
    if(isRetry && !_.contains([messageStatus.retried.name, messageStatus.failed.name], status)) {
      return {};
    }

    var payloads = [{
      topic: messageTraceConfig.topic,
      messages: messages.map(function(message) {
        return JSON.stringify(_.assign({
          topic: topic,
          previousMessageId: message.correlationId,
          nextMessageIds: nextMessageIds,
          status: status,
        }, _.pick(message, ['realmId', 'messageId', 'createdAt', 'retryCount'])));
      })
    }];

    producer.send(payloads, function(err, data) {
      if (err) {
        logStrings = _.union(logStrings, ['SEND FAILED', `Error message: ${err.stack || err.message || err}`]);
        logger.log('error', 'kafkaWorker', 'track', logStrings);
        deferred.reject(err);
      } else {
        logStrings.push('MESSAGES SENT');
        logger.log('verbose', 'kafkaWorker', 'track', logStrings);
        deferred.resolve(data);
      }
    });

    return deferred.promise.nodeify(callback);
  };


  /*
   * Handle OffsetOutOfRange exception
   */
  this.handleOffsetOutOfRange = function(topic, partition, callback) {
    var logStrings = [
      'topic: ' + topic,
      'partition: ' + partition
    ];
    logger.log('verbose', 'kafkaWorker', 'handleOffsetOutOfRange', logStrings);
    var deferred = Q.defer();

    consumer.pause();
    fetchCurrentOffset([{
      topic: topic,
      partition: partition,
      time: -2
    }], function(err, data) {
      if (err) {
        logStrings.push(`Error message : ${err.stack || err.message || err}`);
        logger.log('error', 'kafkaWorker', 'handleOffsetOutOfRange', logStrings);
        return deferred.reject(err);
      }
      consumer.setOffset(topic, partition, data[topic][partition][0]);
      consumer.resume();
      deferred.resolve(data);
    });

    return deferred.promise.nodeify(callback);
  };

  /*
   * Close zookeeper connection
   */
  this.close = function(callback) {
    consumer.close(process.env.FORCE_COMMIT === 'true', function() {
      client.close(callback);
    });
  };
};
