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
   * @this
   * @return {void}
   */
  let BaseKafkaWorker = function() {

    // validate require properties
    // if (!props.zookeeper) { return throws 'zookeeper is required'; }
    // if (!props.worker) { return throws 'worker is required'; }
    // if (!props.processAndBuildNextMessages) { return throw 'processAndBuildNextMessages is not implemented yet'; }

    let kafkaWorker = new KafkaWorker(_.pick(props, [
      'zookeeper',
      'worker',
      'maxSendMessageCount'
    ]), this.proceedMessage.bind(this));

    _.assign(this, kafkaWorker);
  };


  /**
   * On message callback
   * @this
   * @param  {object} message Kafka message
   */
  BaseKafkaWorker.prototype.proceedMessage = function(message) {
    let kafkaWorker = this;

    // build logTrace props
    let props = (kafkaWorker.buildLogTraceProps && kafkaWorker.buildLogTraceProps(message)) || {};
    let logTrace = new WorkerLogTrace(message, props);

    co(function *() {
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
      }
      
      kafkaWorker.done(message, nextMessageIds);
    });
  };

  return BaseKafkaWorker;
};
