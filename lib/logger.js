'use strict';

var _ = require('lodash');


/**
 * Log worker message
 * @param  {object} logger     Logger
 * @param  {string} logLevel   verbose, info, warn, error, fatal
 * @param  {string} workerName Worker name
 * @param  {string} funcName   Function name
 * @param  {object} message    kafka message
 * @param  {array}  logStrings Log strings
 */
exports.logWorker = function(logger, logLevel, workerName, funcName, message, logStrings) {
  var messageValue = message.value;

  var strings = _.union([
    [workerName, funcName].join(' - '),
    [
     'topic: ' + message.topic,
     'partition: ' + message.partition,
     'offset: ' + message.offset,
     'size: ' + message.size + ' bytes'
    ].join(' - '),
    'messageId: ' + messageValue.messageId,
    'realmId: ' + messageValue.realmId,
    'listId: ' + messageValue.listId
  ], logStrings);

  logger[logLevel](strings.join('\n\t'), '\n');
};
