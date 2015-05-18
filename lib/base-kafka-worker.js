'use strict';

let _ = require('lodash');
let Q = require('q');
let co = require('co');

let WorkerLogTrace = require('./worker-log-trace');
let KafkaWorker = require('./kafka-worker');


/**
 * Create class
 * @param  {object} props Config props
 * @return {class}
 */
exports.createClass = function(props) {

  /**
   * BaseKafkaWorker class
   *
   * @this
   * @return {void}
   */
  let BaseKafkaWorker = function() {

    let kafkaWorker = new KafkaWorker(_.pick(props, [
      'zookeeper',
      'worker',
      'maxSendMessageCount',
      'messageTracking'
    ]), this.proceedMessage.bind(this));

    _.each(props, function(value) {
      if (_.isFunction(value)) {
        value.bind(this);
      }
    });

    _.assign(this, kafkaWorker, props);
  };


  /**
   * On message callback
   *
   * @this
   * @param  {object} message Kafka message
   * @return {void}
   */
  BaseKafkaWorker.prototype.proceedMessage = function(message) {
    let kafkaWorker = this;

    // build logTrace props
    let props = (kafkaWorker.buildLogTraceProps && kafkaWorker.buildLogTraceProps(message)) || {};
    let logTrace = new WorkerLogTrace(message, props);
    logTrace.add('info', 'proceedMessage()', 'STARTED');
    logTrace.endSuccess();

    // validate required properties from message value
    if (this.validate && !this.validate(message)) {
      logTrace.add('warn', 'proceedMessage()', 'Not pass validation, ignore processing!');
      return kafkaWorker.done(message);
    }

    co(function *() {
      try {
        // process and build next messages
        let nextMessages = yield kafkaWorker.processAndBuildNextMessages(message);

        let nextMessageIds = [];
        if (nextMessages && nextMessages.length) {
          logTrace.extendProps({
            nextMessages: _.countBy(nextMessages, 'topic')
          });

          let tasks = _.map(nextMessages, function(nextMessage) {
            return kafkaWorker.sendMessages(nextMessage.topic, nextMessage.message);
          });
          nextMessageIds = yield tasks;
          nextMessageIds = _.flatten(nextMessageIds);
          message.nextMessageIds = nextMessageIds;
        }

        // finish to process this message
        logTrace.add('info', 'proceedMessage()', `COMPLETED !`);
        kafkaWorker.done(message, nextMessageIds);

      } catch (e) {
        kafkaWorker.retryAndCommit(message, e);
      }
    });
  };

  return BaseKafkaWorker;
};
