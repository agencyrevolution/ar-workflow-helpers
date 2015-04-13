var _ = require('lodash');


/**
 * Module export
 * @return {Object}
 */
module.exports = {
  operators: {
    equal: {
      text: 'Equal to',
      name: 'equal',
      compareFunc: function(value1, value2) {
        return value1 === value2;
      }
    },
    notEqual: {
      text: 'Not equal to',
      name: 'notEqual',
      compareFunc: function(value1, value2) {
        return value1 !== value2;
      }
    },
    lessThan: {
      text: 'Less than',
      name: 'lessThan',
      compareFunc: function(value1, value2) {
        return value1 < value2;
      }
    },
    lessThanOrEqual: {
      text: 'Less than or equal',
      name: 'lessThanOrEqual',
      compareFunc: function(value1, value2) {
        return value1 <= value2;
      }
    },
    greaterThan: {
      text: 'Greater than',
      name: 'greaterThan',
      compareFunc: function(value1, value2) {
        return value1 > value2;
      }
    },
    greatThanOrEqual: {
      text: 'Greater than or equal',
      name: 'greaterThanOrEqual',
      compareFunc: function(value1, value2) {
        return value1 >= value2;
      }
    },
    startWith: {
      text: 'Start with',
      name: 'startsWith',
      compareFunc: function(value1, value2) {
        return _.startsWith(value1, value2);
      }
    },
    contain: {
      text: 'Contain',
      name: 'contain',
      compareFunc: function(value1, value2) {
        return _.contains(value1, value2);
      }
    },
    equalDate: {
      text: 'Equal date',
      name: 'equalDate',
      compareFunc: function(value1, value2) {
        var date1 = new Date(value1);
        var date2 = new Date(value2);
        return date1.getDate() === date2.getDate() &&
            value1.getMonth() === date2.getMonth() &&
            value1.getFullYear() === date2.getFullYear();
      }
    },
    betweenDate: {
      text: 'Between date',
      name: 'betweenDate',
      compareFunc: function(value1, value2, value3) {
        var date1 = new Date(value1);
        var date2 = new Date(value2);
        var date3 = new Date(date3);
        return date1 >= date2 && date1 <= date3;
      }
    },
    beforeDate: {
      text: 'Before date',
      name: 'beforeDate',
      compareFunc: function(value1, value2) {
        var date1 = new Date(value1);
        var date2 = new Date(value2);
        return date1 < date2;
      }
    },
    afterDate: {
      text: 'After date',
      name: 'afterDate',
      compareFunc: function(value1, value2) {
        var date1 = new Date(value1);
        var date2 = new Date(value2);
        return date1 > date2;
      }
    }
  }
};
