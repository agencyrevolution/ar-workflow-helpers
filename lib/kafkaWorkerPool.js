var fs = require('fs'),
    _ = require('lodash'),
    async = require('async');


/**
 * Exports
 * @param  {Object} options Options
 */
module.exports = function(options) {
  var kafkaWorkers = [],
      logger = options.logger,
      pidFilePath = options.pidFilePath,
      kafkaWorkerConfigs = options.kafkaWorkers;

  // start worker
  _.each(kafkaWorkerConfigs, function(workerConfig, index) {
    for (var i = 1; i <= workerConfig.count; i++) {
      logger.info('Starting ' + workerConfig.name + ' worker (id = ' + i + ')');
      var worker = new workerConfig.workerClass();
      worker.start();
      kafkaWorkers.push(worker);
    }
  });

  // write pid to file
  if (pidFilePath) {
    logger.info('Process Id: ', process.pid, '\n\t pidfile: ', pidFilePath);
    fs.writeFileSync(pidFilePath, process.pid + '\n');
  }

  process.stdin.resume(); //so the program will not close instantly

  var exitHandler = function(exitOptions, err) {
    logger.info('Exit: ', exitOptions);

    if (exitOptions.cleanup) {
      logger.info('App exit cleaned.');
    }
    if (err) {
      logger.error(err.stack);
    }
    if (exitOptions.exit) {
      async.parallel(kafkaWorkers.map(function(worker) {
        return function(cb) {
          logger.info('Closing worker ');
          worker.close(cb);
        }
      }), function(error, results) {
        logger.info('Exit ', kafkaWorkers.length, 'kafkaWorkers');
        if (error) {
          logger.error(error);
        }
        logger.info('Results:', results);
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
