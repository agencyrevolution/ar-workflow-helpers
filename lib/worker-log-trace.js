'use strict';

var _ = require('lodash');
var LogTrace = require('./log-trace');


/**
 * WorkerLogTrace class
 * @param {object} message Kafka message
 * @param {object} props   Properties
 * @this
 */
var WorkerLogTrace = function(message, props) {
  var messageValue = message.value;
  var messageProps = _.pick(message, ['topic', 'partition', 'offset', 'size']);
  var messageValueProps = _.pick(messageValue, [
    'messageId',
    'correlationId',
    'createdAt',
    'realmId',
    'listId',
    'retryCount'
  ]);

  this.logTrace = new LogTrace(_.assign(messageProps, messageValueProps, props));

  // assign this instance to message for reference later
  message.logTrace = this;
};


WorkerLogTrace.prototype.add = function(logLevel, entityType, message, startedAt) {
  return this.logTrace.add(logLevel, entityType, message, startedAt);
};

WorkerLogTrace.prototype.extendProps = function(props) {
  return this.logTrace.extendProps(props);
};



/**
 * Write out log
 * @param  {array} nextMessageIds Next message ids
 */
WorkerLogTrace.prototype.endSuccess = function(nextMessageIds) {
  this.logTrace.extendProps({ nextMessageIds: nextMessageIds });
  this.logTrace.end();
};


/**
 * Write out all logs
 * @param  {array} nextMessageIds Next message ids
 */
WorkerLogTrace.prototype.endError = function(nextMessageIds) {
  this.logTrace.extendProps({ nextMessageIds: nextMessageIds });
  this.logTrace.end('error');
};


/**
 * Module export
 * @type {class}
 */
module.exports = WorkerLogTrace;
