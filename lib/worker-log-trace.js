'use strict';

let _ = require('lodash');
let LogTrace = require('./log-trace');


/**
 * WorkerLogTrace class
 *
 * @param {object} message Kafka message
 * @param {object} props   Properties
 * @this
 */
let WorkerLogTrace = function(message, props) {
  let messageValue = message.value;
  let messageProps = _.pick(message, ['topic', 'partition', 'offset', 'size']);
  let messageValueProps = _.pick(messageValue, [
    'messageId',
    'correlationId',
    'createdAt',
    'realmId',
    'listId',
    'retryCount'
  ]);

  let createdAt = messageValue.createdAt;
  if (createdAt) {
    messageValueProps.createdAt = `${new Date(createdAt)} (${createdAt})`;
  }

  this.logTrace = new LogTrace(_.assign(messageProps, messageValueProps, props));

  // assign this instance to message for reference later
  message.logTrace = this;
};


/**
 * Add a log entry
 *
 * @param {string} logLevel   Log level
 * @param {string} entityType Entity type
 * @param {object} message    Log string
 * @param {timestamp} startedAt  When did this entity type started to log
 */
WorkerLogTrace.prototype.add = function(logLevel, entityType, message, startedAt) {
  this.logTrace.add(logLevel, entityType, message, startedAt);
};


/**
 * Extend props
 *
 * @param  {object} props Props
 */
WorkerLogTrace.prototype.extendProps = function(props) {
  this.logTrace.extendProps(props);
};


/**
 * Write out log
 *
 * @param  {array} nextMessageIds Next message ids
 */
WorkerLogTrace.prototype.endSuccess = function(nextMessageIds) {
  this.logTrace.extendProps({ nextMessageIds: nextMessageIds });
  this.logTrace.end(process.env.LOG_LEVEL === 'verbose' ? 'verbose' : 'info');
};


/**
 * Write out all logs
 *
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
