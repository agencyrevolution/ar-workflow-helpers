var fs = require('fs'),
    async = require('async');


/**
 * Exports
 * @param  {Object} kafkaProducer Kafka producer
 */
module.exports = function(kafkaWorkers, logger, pidFilePath) {
    
  if (pidFilePath) {
    logger.info('Process Id: ', process.pid, '\n\t pidfile: ', pidFilePath);
    fs.writeFileSync(pidFilePath, process.pid + '\n');
  }

  process.stdin.resume(); //so the program will not close instantly

  var exitHandler = function(options, err) {
    logger.info('Exit: ', options);

    if (options.cleanup) {
      logger.info('App exit cleaned.');
    }
    if (err) {
      logger.error(err.stack);
    }
    if (options.exit) {
      async.parallel(kafkaWorkers.map(function(worker) {
        return function(cb) {
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
