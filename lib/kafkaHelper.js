var Q = require('q'),
    kafka = require('kafka-node'),
    Producer = kafka.Producer;


/**
 * Export common methods for consumer and producer
 * @param  {object} client kafka client
 * @param  {object} logger logger
 * @this
 * @return {object}          
 */
module.exports = function(messageTraceConfig, client, logger) {
  var offset = new kafka.Offset(client),
      producer = new Producer(client);


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
   * Ensure producer is ready
   */
  this.init = function(callback) {
    var deferred = Q.defer();
    if (producer.ready) {
      deferred.resolve(producer);
    } else {
      producer.on('ready', function() {
        logger.info('Producer is ready!');
        deferred.resolve(producer);
      });
    }
    return deferred.promise.nodeify(callback);
  };


  /*
   * Consumer commit
   */
  this.commitMessage = function(consumer, message, messageValue, callback) {
    logger.info('kafkaHelper - commitMessage()');
    
    var deferred = Q.defer();
    var self = this;

    consumer.commit(true, function(err, data) {
      if (err) {
        logger.error('commitMessage(message, messageValue) - COMMIT FAILED: ', err, 
            '\n\t message info: ', message.topic, ' - ', message.offset, ' - ', message.partition);
        return deferred.reject(err);
      }

      logger.info('commitMessage(message, messageValue) - MESSAGE COMMITTED: ', 
          '\n\t message info: ', message.topic, ' - ', message.offset, ' - ', message.partition);
      self.track(message.topic, [messageValue], messageTraceConfig.states.committed);
      deferred.resolve(true);

    });

    return deferred.promise.nodeify(callback);
  };

  /*
   * producer send
   */
  this.sendMessages = function(payloads, sentMessages, callback) {
    logger.info('kafkaHelper - sendMessages(payloads)');

    var deferred = Q.defer();
    var self = this;

    producer.send(payloads, function(err, data) {

      if (err) {
        logger.error('kafkaHelper - sendMessages(payloads) - SEND FAILED ', err,
            '\n\t message topic: ', payloads.map(function(p) {
              return p.topic;
            }));
        return deferred.reject(err);
      }

      logger.info('kafkaHelper - sendMessages(payloads) - MESSAGE SENT: ',
          '\n\t message topic: ', payloads.map(function(p) {
            return p.topic;
          }));
      self.track(payloads[0].topic, sentMessages, messageTraceConfig.states.sent);
      deferred.resolve(data);

    });

    return deferred.promise.nodeify(callback);
  };

  /*
   * Hanlde retry
   */
  this.retry = function(retryTopic, messageValue, callback) {
    logger.warn('kafkaHelper - retry(): ',
        '\n\t message retryTopic: ', retryTopic);
    var deferred = Q.defer();

    var payloads = [{
      topic: retryTopic,
      messages: JSON.stringify(messageValue)
    }];

    return this.sendMessages(payloads, [messageValue], callback);
  };


  /*
   * send message to messageTrace topic
   */
  this.track = function(topic, messages, status, nextMessageIds, callback) {
    logger.info('kafkaHelper - track(message)',
        '\n\t message topic: ', topic,
        '\n\t status: ', status);
    var createdAt = new Date();
    var payloads = [{
      topic: messageTraceConfig.topic,
      messages: messages.map(function(messageValue) {
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
        logger.error('kafkaHelper - sendMessages(payloads) - SEND FAILED ', err,
            '\n\t message topic: ', payloads.map(function(p) {
              return p.topic;
            }));
      }

      logger.info('kafkaHelper - sendMessages(payloads) - MESSAGE SENT: ',
          '\n\t message topic: ', payloads.map(function(p) {
            return p.topic;
          }));

    });
  };

  /*
   * Handle OffsetOutOfRange exception
   */
  this.handleOffsetOutOfRange = function(consumer, topic, partition, callback) {
    logger.info('kafkaHelper - handleOffsetOutOfRange(): ');
    var deferred = Q.defer();

    consumer.pause();
    fetchCurrentOffset([{
      topic: topic,
      partition: partition,
      time: -1
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
};
