'uses strict';


/**
 * The TIME_SIMULATION is only meant for testing, should never be set in production
 * @return {void}
 */
exports.setSystemTime = function() {
  if (!process.env.TIME_SIMULATION || process.env.NODE_ENV === 'production') { return; }

  var simulatedTime = new Date(process.env.TIME_SIMULATION);

  if (simulatedTime.toString() === 'Invalid Date') {
    return console.log('TIME_SIMULATION is not valid');
  }

  var timeMachine = require('timemachine');
  timeMachine.config({
    dateString: process.env.TIME_SIMULATION,
    tick: true
  });
  console.log('Time set: ', process.env.TIME_SIMULATION);
};
