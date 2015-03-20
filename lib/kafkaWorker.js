var Q = require('q');
var kafka = require('kafka-node');
var _ = require('lodash');

var messageTraceConfig = require('./messageTrace');


/**
 * Export common methods for consumer and producer
 * @param  {object} config object providing zookeeper, worker, messageTrace configuration
 * @param  {object} logger logger
 * @param  {Function} onMessageCallback the callback handling the event when message is fetched
 * @this
 */
module.exports = function(config, logger, onMessageCallback) {
  var zookeeperConfig = config.zookeeper;
  var consumerConfig = config.worker.consumer;
  var messageTracking = config.messageTracking !== undefined ? config.messageTracking : true;
  var retryTopic = config.worker.retryTopic;

  var client = new kafka.Client(zookeeperConfig.connectionString, zookeeperConfig.clientId, zookeeperConfig.options);
  var offset = new kafka.Offset(client);
  var consumer = new kafka.Consumer(client, consumerConfig.payloads, consumerConfig.options);
  var producer = new kafka.Producer(client);

  var self = this;

  /*
   * Get fetch type
   */
  var getFetchType = function(message) {
    return message.topic + ' - Partition ' + message.partition;
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
   * Log
   */
  var log = function(logLevel, funcSignature, message, logMessages) {
    var logStrings = _.union([
      'kafkaWorker - ' + funcSignature,
      [
        'topic: ' + message.topic,
        'partition: ' + message.partition,
        'offset: ' + message.offset,
        'size: ' + message.size + ' bytes'
      ].join(' - ')
    ], logMessages);
    logger[logLevel](logStrings.join('\n\t'), '\n');
  };


  /*
   * Ensure producer is ready before sending messages to kafka
   */
  var ensureProducerReady = function(callback) {
    var deferred = Q.defer();

    if (!producer.ready) {
      producer.on('ready', function() {
        logger.info('Producer is ready!');
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
        logger.error('Offset.fetch(): ', err);
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
      'PROCESSING MESSAGES INFO OF THIS FETCH',
      '---------------------------------------------------------'
    ];
    for (var fetchType in fetchData) {
      logStrings.push('Topic ' + fetchType + ' - ' + fetchData[fetchType].length + ' messages');
    }
    logStrings.push('\nDetails: ' + JSON.stringify(fetchData));
    logStrings.push('---------------------------------------------------------');
    logger.info(logStrings.join('\n'), '\n');
  };


  consumer.on('message', function(message) {

    // pause consumer until all messages of this fetch commited
    consumer.pause();

    try {
      message.size = message.value.length;
      message.value = JSON.parse(message.value);
      message.value.createdAt = new Date();

      var fetchType = getFetchType(message);
      fetchData[fetchType] = _.union(fetchData[fetchType], [
        _.pick(message, ['offset', 'size'])
      ]);
      logFetchData();

      self.track(message.topic, [message.value], messageTraceConfig.states.fetched);

      onMessageCallback(message);
    } catch (e) {
      log('error', 'consumer.on(message)', message, ['Error: ' + e.message || e]);
      self.retryAndCommit(message);
    }
  });

  consumer.on('error', function(err) {
    logger.error('consumer.on(err): ', err);
    logger.info('Reconnecting...');
  });

  consumer.on('offsetOutOfRange', function(err) {
    logger.error('consumer.on(offsetOutOfRange): ', err);
    self.handleOffsetOutOfRange(err.topic, err.partition);
  });


  /*
   * Consumer commit
   */
  this.commitMessage = function(message, callback) {
    var deferred = Q.defer();

    consumer.commit(true, function(err, data) {
      if (err) {
        log('error', 'commitMessage(message)', message, [err]);
        return deferred.reject(err);
      }

      // commit successfully, update list of processing message offsets
      var fetchType = getFetchType(message);
      fetchData[fetchType] = _.reject(fetchData[fetchType], _.pick(message, ['offset', 'size']));

      // log fetch data
      logFetchData();

      // check if all messages are completed processing, resume consumer for next fetch request
      if (areMessagesProceeded()) {
        logger.info('All fetched messages have been committed! Resume consumer to send next fetch request...', '\n');
        consumer.resume();
      }

      log('info', 'commitMessage(message)', message, ['MESSAGE COMMITED']);
      self.track(message.topic, [message.value], messageTraceConfig.states.committed);
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

    offset.commit(groupId, payloads, function(err, data) {
      if (err) {
        log('error', 'commitOffset', message, ['groupId: ' + groupId, err]);
        deferred.reject(err);
      } else {
        log('info', 'commitOffset', message, ['groupId: ' + groupId, 'OFFSET COMMITTED!']);
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

    this.commitMessage(message, function(err, res) {
      if (err) {
        log('error', 'commitMessage()', message, [
          'Error: ' + err,
          'Retry in 5 seconds...'
        ]);

        setTimeout(function() {
          self.done(message);
        }, 5000);
      } else {
        self.track(message.topic, [message.value], messageTraceConfig.states.succeeded, nextMessageIds);
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
        log('error', 'commitOffset()', message, [
          'Error: ' + err,
          'Retry in 5 seconds...'
        ]);

        setTimeout(function() {
          self.doneOffset(message, nextMessageIds);
        }, 5000);
      } else {
        self.track(message.topic, [message.value], messageTraceConfig.states.succeeded, nextMessageIds);
      }
    });
  };


  /*
   * producer send
   */
  this.sendMessages = function(topic, messages, callback) {
    logger.info('kafkaWorker - sendMessages(payloads)');

    var deferred = Q.defer();

    var payloads = [
      {
        topic: topic,
        messages: messages.map(function(msg) {
          msg.createdAt = new Date();
          return JSON.stringify(msg);
        })
      }
    ];

    ensureProducerReady().then(function() {
      producer.send(payloads, function(err, data) {
        if (err) {
          logger.error('kafkaWorker - sendMessages(payloads) - SEND FAILED ', err,
                  '\n\t message topic: ', payloads.map(function(p) {
                    return p.topic;
                  }));
          return deferred.reject(err);
        }

        logger.info('kafkaWorker - sendMessages(payloads) - MESSAGE SENT: ',
                '\n\t message topic: ', payloads.map(function(p) {
                  return p.topic;
                }));
        self.track(payloads[0].topic, messages, messageTraceConfig.states.sent);
        deferred.resolve(data);
      });
    });

    return deferred.promise.nodeify(callback);
  };


  /*
   * producer send mesages and track as retried
   */
  this.resendMessages = function(topic, messages, callback) {
    var deferred = Q.defer();
    this.sendMessages(topic, messages, function(err, res) {
      if (err) {
        return deferred.reject(err);
      }
      self.track(topic, messages, messageTraceConfig.states.retried);
      deferred.resolve(res);
    });
    return deferred.promise.nodeify(callback);
  };


  /*
   * Hanlde retry
   */
  this.retryAndCommit = function(message) {
    log('warn', 'retryAndCommit(message)', message, ['Retry topic: ' + retryTopic]);

    this.sendMessages(retryTopic, [message.value])
        .then(function(res) {
          return self.commitMessage(message);
        })
        .catch(function(err) {
          log('error', 'retryAndCommit(message)', message, [
            'Retry topic: ' + retryTopic],
              'Error: ' + err
              );
          setTimeout(function() {
            self.retryAndCommit(message);
          }, 5000);
        });
  };


  /*
   * send message to messageTrace topic
   */
  this.track = function(topic, messages, status, nextMessageIds, callback) {
    logger.info('kafkaWorker - track(message)',
        '\n\t message topic: ', topic,
        '\n\t status: ', status, '\n');

    if (!messageTracking) {
      return;
    }

    var payloads = [{
      topic: messageTraceConfig.topic,
      messages: messages.map(function(messageValue) {

        var createdAt = new Date(messageValue.createdAt);

        return JSON.stringify({
          messageId: messageValue.messageId,
          realmId: messageValue.realmId,
          topic: topic,
          previousMessageId: messageValue.correlationId,
          nextMessageIds: nextMessageIds,
          status: status,
          retryCount: messageValue.retryCount,
          createdAt: createdAt,
          createdAtTimestamp: createdAt.getTime()
        });
      })
    }];

    producer.send(payloads, function(err, data) {

      if (err) {
        logger.error('kafkaWorker - track() - SEND FAILED ', err,
            '\n\t message topic: ', payloads.map(function(p) {
              return p.topic;
            }));
      }

      logger.info('kafkaWorker - track() - MESSAGE SENT: ',
          '\n\t message topic: ', payloads.map(function(p) {
            return p.topic;
          }));

    });
  };


  /*
   * Handle OffsetOutOfRange exception
   */
  this.handleOffsetOutOfRange = function(topic, partition, callback) {
    logger.info('kafkaWorker - handleOffsetOutOfRange()',
                '\n\t topic: ', topic,
                '\n\t partition: ', partition, '\n');
    var deferred = Q.defer();

    consumer.pause();
    fetchCurrentOffset([{
      topic: topic,
      partition: partition,
      time: -2
    }], function(err, data) {
      if (err) {
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
