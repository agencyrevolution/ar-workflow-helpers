'use strict';

const _ = require('lodash');
const co = require('co');
const uuid = require('node-uuid');
const thunkify = require('thunkify');

const WorkerLogTrace = require('./worker-log-trace');
const KafkaWorker = require('./kafka-worker');

const kafkaWorkerMaps = new WeakMap();


/**
* Proceed message
*
* @param  {object} instance Worker instance
* @param  {object} message  Message
* @return {void}
*/
function proceedMessage(instance, message) {
  let kafkaWorker = kafkaWorkerMaps.get(instance);

  // build logTrace props
  const props = instance.buildLogTraceProps(message) || {};
  const logTrace = new WorkerLogTrace(message, props);
  logTrace.add('info', 'proceedMessage()', 'STARTED');
  logTrace.endSuccess();

  // validate required properties from message value
  if (!instance.validate(message)) {
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
      let nextMessages = yield instance.processAndBuildNextMessages(message);

      let nextMessageIds = [];
      if (nextMessages) {
        if (!_.isArray(nextMessages)) { nextMessages = [nextMessages]; }
        nextMessageIds = yield instance.sendNextMessages(message, nextMessages);
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
  });
}


class Worker {

  /**
   * Constructor
   * @return {object} Properties
   */
  constructor(configProps) {
    const instance = this;

    // disabled messageTracking for test environment
    if (process.env.NODE_ENV === 'test') {
      configProps.messageTracking = false;
    }

    const kafkaWorker = new KafkaWorker(configProps, function(message) {
      proceedMessage(instance, message);
    });

    kafkaWorkerMaps.set(this, kafkaWorker);
  }

  *validate(message) {
    return true;
  }


  *buildLogTraceProps(message) {
    return {};
  }


  *processAndBuildNextMessages(message) {
    return [];
  }


  /**
   * Send next messages
   *
   * @param {object} message       Message
   * @param {array}  nextMessages  Next messages
   * @return {array}               Next message ids
   */
  *sendNextMessages(message, nextMessages) {
    const logTrace = message.logTrace;
    const kafkaWorker = kafkaWorkerMaps.get(this);
    const messageValue = message.value;

    logTrace.extendProps({
      nextMessages: _.countBy(nextMessages, 'topic')
    });

    const tasks = _.map(nextMessages, function(nextMessage) {
      const nextMsg = nextMessage.message;
      nextMsg.createdAt = nextMsg.createdAt || Date.now();
      nextMsg.messageId = nextMsg.messageId || uuid.v4();
      nextMsg.correlationId = messageValue.messageId;
      nextMsg.originId = messageValue.originId || messageValue.messageId;
      return kafkaWorker.sendMessages(nextMessage.topic, nextMsg);
    });

    const nextMessageIds = yield tasks;
    return _.flatten(nextMessageIds);
  }

  close(cb) {
    const kafkaWorker = kafkaWorkerMaps.get(this);
    kafkaWorker.close(cb);
  }

};


/**
 * Worker
 * @type {class}
 */
module.exports = Worker;
