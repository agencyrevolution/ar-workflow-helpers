'use strict';

let _ = require('lodash');

let logger = require('./logger');

let logLevels = {
  verbose: 1,
  debug: 2,
  info: 3,
  warn: 4,
  error: 5
};

let LogTrace = function(props) {
  this.logTraces = [];
  this.props = props || {};
  this.startedAt = Date.now();
};


/**
 * Extend props
 * @param  {object} props Properties
 */
LogTrace.prototype.extendProps = function(props) {
  _.assign(this.props, props);
};


/**
 * Add a log entry
 * @param {string} logLevel  Log level
 * @param {string} logType   Log type
 * @param {string} message   Log message
 * @param {timestamp} startedAt Started at
 * @return {timestamp}
 */
LogTrace.prototype.add = function(logLevel, logType, message, startedAt) {
  let now = Date.now();

  let msgs = [];
  if (message) {
    msgs.push(message);
  }
  if (startedAt) {
    msgs.push(`(${now - startedAt} ms)`);
  }

  this.logTraces.push({
    logLevel: logLevel,
    logType: logType,
    message: msgs.join(' ')
  });
  return now;
};


/**
 * Write out log
 * @param  {string} logLevel Log level
 */
LogTrace.prototype.end = function(logLevel) {
  if (!logLevel) { logLevel = 'info'; }

  let logTraces = this.logTraces;

  if(_.findWhere(logTraces, { logLevel: 'error' })) {
    logLevel = 'error';
  } else if(_.findWhere(logTraces, { logLevel: 'warn' })) {
    logLevel = 'warn';
  }

  if (logLevel !== 'error') {
    logTraces = _.filter(this.logTraces, function(logTrace) {
      return logLevels[logLevel] <= logLevels[logTrace.logLevel];
    });
  }

  let strings = logTraces.map(function(logTrace, idx) {
    return `[${idx + 1}] ${logTrace.logLevel.toUpperCase()} ${logTrace.logType} : ${logTrace.message}`;
  });

  _.assign(this.props, { processTime: Date.now() - this.startedAt });

  if (process.env.LOG_JSON) {
    logger[logLevel](_.assign(this.props, {
      message: strings.join('\n\t')
    }));
  } else {
    strings = _.union(_.map(this.props, function(value, key) {
      return `${key}: ${JSON.stringify(value)}`;
    }), strings);
    logger[logLevel](strings.join('\n\t'), '\n');
  }
};


/**
 * Export
 * @type {class}
 */
module.exports = LogTrace;
