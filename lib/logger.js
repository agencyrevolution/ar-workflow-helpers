'use strict';

var _ = require('lodash');
var winston = require('winston');

require('winston-logstash');

var logProps = {
  level: process.env.LOG_LEVEL || 'info',
  json: process.env.LOG_JSON === 'true',
  timestamp: process.env.LOG_TIMESTAMP !== 'false'
};

var transports = [];

/*
 * Log console
 */
if (process.env.LOG_CONSOLE_ENABLED !== 'false') {
  var consoleLogConfig = _.assign({
    colorize: process.env.LOG_CONSOLE_COLORIZE !== 'false'
  }, logProps);
  var consoleLog = new(winston.transports.Console)(consoleLogConfig);
  transports.push(consoleLog);
}

/*
 * Log stash
 */
if (process.env.LOG_STASH_ENABLED !== 'false') {
  var logstashConfig = _.assign({
    host: process.env.LOG_STASH_HOST || '127.0.0.1',
    port: process.env.LOG_STASH_PORT || 28777
  }, logProps);
  var logstashLog = new(winston.transports.Logstash)();
  transports.push(logstashLog);
}

/*
 * Winston set levels
 */
winston.setLevels({
  debug: 0,
  info: 1,
  silly: 2,
  warn: 3,
  error: 4
});

/*
 * Winston add colors for each level
 */
winston.addColors({
  debug: 'pink',
  info: 'cyan',
  silly: 'magenta',
  warn: 'yellow',
  error: 'red'
});

var logger = new(winston.Logger)({
  transports: transports
});


/*
 * Log strings as format
 */
var log = function(logLevel, strings) {
  logger[logLevel](strings.join('\n\t'), '\n');
};


/**
 * Log worker message
 * @param  {string} logLevel   verbose, info, warn, error, fatal
 * @param  {string} workerName Worker name
 * @param  {string} funcName   Function name
 * @param  {object} message    kafka message
 * @param  {array}  logStrings Log strings
 */
exports.logWorker = function(logLevel, workerName, funcName, message, logStrings) {
  var messageValue = message.value;

  var strings = _.union([
    [workerName, funcName + '()'].join(' - '),
    [
     'topic: ' + message.topic,
     'partition: ' + message.partition,
     'offset: ' + message.offset,
     'size: ' + message.size + ' bytes'
    ].join(' - '),
    'messageId: ' + messageValue.messageId,
    'correlationId: ' + messageValue.correlationId,
    'createdAt: ' + messageValue.createdAt,
    'realmId: ' + messageValue.realmId,
    'listId: ' + messageValue.listId
  ], logStrings);

  log(logLevel, strings);
};


/**
 * Log as format
 * @param  {string} logLevel   Log level
 * @param  {string} entity     E.g. Account middleware
 * @param  {string} funcName   Function name
 * @param  {array}  logStrings Array of log strings
 */
exports.log = function(logLevel, entity, funcName, logStrings) {
  log(logLevel, _.union([[entity, funcName + '()'].join(' - ')], logStrings));
};


exports.debug = logger.debug;
exports.verbose = logger.verbose;
exports.info = logger.info;
exports.warn = logger.warn;
exports.error = logger.error;
