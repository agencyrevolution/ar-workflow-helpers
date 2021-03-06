'use strict';

const _ = require('lodash');
const co = require('co');
const uuid = require('node-uuid');

const WorkerLogTrace = require('./worker-log-trace');
const KafkaWorker = require('./kafka-worker');


/**
 * Create class
 * @param  {object} props Config props
 * @return {class}
 */
exports.createClass = function(props) {

  /**
   * BaseKafkaWorker class
   *
   * @param {object} options Options
   * @this
   * @return {void}
   */
  const BaseKafkaWorker = function(options) {

    const cfg = _.assign({}, _.pick(props, [
      'zookeeper',
      'worker',
      'maxSendMessageCount',
      'messageTracking'
    ]), options);
    const kafkaWorker = new KafkaWorker(cfg, this.proceedMessage.bind(this));

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
    const kafkaWorker = this;

    // build logTrace props
    const props = (kafkaWorker.buildLogTraceProps && kafkaWorker.buildLogTraceProps(message)) || {};
    const logTrace = new WorkerLogTrace(message, props);
    logTrace.add('info', 'proceedMessage()', 'STARTED');
    logTrace.endSuccess();

    // validate required properties from message value
    if (this.validate && !this.validate(message)) {
      logTrace.add('warn', 'proceedMessage()', 'Not pass validation, ignore processing!');
      return kafkaWorker.done(message);
    }

    co(function *() {
      try {
        logTrace.extendProps(_.pick(message.value, [
          'messageId',
          'correlationId',
          'originId'
        ]));

        // process and build next messages
        let nextMessages = yield kafkaWorker.processAndBuildNextMessages(message);

        let nextMessageIds = [];
        if (nextMessages) {
          if (!_.isArray(nextMessages)) { nextMessages = [nextMessages]; }
          nextMessageIds = yield this.sendNextMessages(message, nextMessages);
        }
        message.nextMessageIds = nextMessageIds;

        // finish to process this message
        logTrace.add('info', 'proceedMessage()', `COMPLETED !`);
        kafkaWorker.done(message, nextMessageIds);

      } catch (e) {
        // ignore to retry this message
        if (process.env.RETRY === 'false') {
          logTrace.add('error', 'proceedMessage()', e.stack);
          return kafkaWorker.done(message);
        }
        kafkaWorker.retryAndCommit(message, e);
      }
    }.bind(this));
  };


  /**
   * Send next messages
   *
   * @param  {object} message      Message
   * @param  {array} nextMessages Next messages
   * @return {array}              Next message ids
   */
  BaseKafkaWorker.prototype.sendNextMessages = function *(message, nextMessages) {
    const logTrace = message.logTrace;
    const kafkaWorker = this;
    const messageValue = message.value;

    const originId = messageValue.originId || messageValue.correlationId || messageValue.messageId;

    logTrace.extendProps({
      nextMessages: _.countBy(nextMessages, 'topic'),
      originId: originId
    });

    const tasks = _.map(nextMessages, function(nextMessage) {
      _.assign(nextMessage.message, {
        correlationId: messageValue.messageId,
        originId: originId
      });
      return kafkaWorker.sendMessages(nextMessage.topic, nextMessage.message);
    });

    const nextMessageIds = yield tasks;
    return _.flatten(nextMessageIds);
  };

  return BaseKafkaWorker;
};
