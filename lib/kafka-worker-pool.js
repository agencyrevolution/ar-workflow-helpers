'use strict';

var fs = require('fs');
var _ = require('lodash');
var async = require('async');

var logger = require('./logger');


/**
 * Exports
 * @param  {Object} options Options
 */
module.exports = function(options) {
  var kafkaWorkers = [];
  var pidFilePath = options.pidFilePath;
  var kafkaWorkerConfigs = options.kafkaWorkers;

  // start worker
  _.each(kafkaWorkerConfigs, function(workerConfig, index) {
    for (var i = 1; i <= workerConfig.count; i++) {
      console.log('Starting ' + workerConfig.name + ' worker (id = ' + i + ')');
      var worker = new workerConfig.workerClass();
      worker.start && worker.start();
      kafkaWorkers.push(worker);
    }
  });

  // write pid to file
  if (pidFilePath) {
    console.log('Process Id: ', process.pid, '\n\t pidfile: ', pidFilePath);
    fs.writeFileSync(pidFilePath, process.pid + '\n');
  }

  process.stdin.resume(); //so the program will not close instantly

  var exitHandler = function(exitOptions, err) {
    console.log('Exit: ', exitOptions);

    if (exitOptions.cleanup) {
      console.log('App exit cleaned.');
    }
    if (err) {
      logger.error(err.stack);
    }
    if (exitOptions.exit) {
      async.parallel(kafkaWorkers.map(function(worker) {
        return function(cb) {
          console.log('Closing worker ');
          worker.close(cb);
        }
      }), function(error, results) {
        console.log('Exit ', kafkaWorkers.length, 'kafkaWorkers');
        if (error) {
          logger.error(error);
        }
        console.log('Results:', results);
        if (pidFilePath) {
          fs.unlink(pidFilePath);
        }
        process.exit(0);
      });
    }
  };

  //do something when app is closing
  process.on('exit', exitHandler.bind(null, {
    info: 'exiting...',
    cleanup: true
  }));

  //catches ctrl+c event
  process.on('SIGINT', exitHandler.bind(null, {
    info: 'SIGINT',
    exit: true
  }));

  //catches uncaught exceptions
  process.on('uncaughtException', exitHandler.bind(null, {
    info: 'uncaughtException',
    exit: true
  }));

  process.on('SIGTERM', exitHandler.bind(null, {
    info: 'SIGTERM',
    exit: true
  }));

};
