/**
 * Export method for setting system time into TIME_SIMULATION environment variables
 * @return {[type]} [description]
 */
module.exports = {

  /*
   * The TIME_SIMULATION is only meant for testing, should never be set in production
   */
  setSystemTime: function() {
    if (process.env.TIME_SIMULATION && process.env.NODE_ENV !== 'production') {
      
      var simulatedTime = new Date(process.env.TIME_SIMULATION);
  
      if (simulatedTime.toString() === 'Invalid Date') {
        logger.error('TIME_SIMULATION is not valid');
      } else {
        var timeMachine = require('timemachine');
        timeMachine.config({
          dateString: process.env.TIME_SIMULATION,
          tick: true
        });
        console.log('Time set: ', process.env.TIME_SIMULATION);
      }
  
    }

  }
};
