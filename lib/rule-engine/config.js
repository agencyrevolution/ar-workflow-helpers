var _ = require('lodash');


/**
 * Module export
 * @return {Object}
 */
module.exports = {
  operators: {
    equal: {
      text: 'Is',
      name: 'equal',
      compareFunc: function(value1, value2) {
        return value1 === value2;
      }
    },
    notEqual: {
      text: 'Is Not',
      name: 'notEqual',
      compareFunc: function(value1, value2) {
        return value1 !== value2;
      }
    },
    lessThan: {
      text: 'Less Than',
      name: 'lessThan',
      compareFunc: function(value1, value2) {
        return value1 < value2;
      }
    },
    lessThanOrEqual: {
      text: 'Less Than Or Equal',
      name: 'lessThanOrEqual',
      compareFunc: function(value1, value2) {
        return value1 <= value2;
      }
    },
    greaterThan: {
      text: 'Greater Than',
      name: 'greaterThan',
      compareFunc: function(value1, value2) {
        return value1 > value2;
      }
    },
    greaterThanOrEqual: {
      text: 'Greater Than Or Equal',
      name: 'greaterThanOrEqual',
      compareFunc: function(value1, value2) {
        return value1 >= value2;
      }
    },
    startWith: {
      text: 'Starts With',
      name: 'startWith',
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
      text: 'Equal',
      name: 'equalDate',
      compareFunc: function(value1, value2) {
        var date1 = new Date(value1);
        var date2 = new Date(value2);
        return date1.getDate() === date2.getDate() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getFullYear() === date2.getFullYear();
      }
    },
    betweenDate: {
      text: 'Between',
      name: 'betweenDate',
      compareFunc: function(dateValue, fromTimestamp, toTimestamp) {
        var timestampValue = new Date(dateValue).getTime();
        return fromTimestamp < timestampValue && timestampValue < toTimestamp;
      }
    },
    beforeDate: {
      text: 'Before',
      name: 'beforeDate',
      compareFunc: function(dateValue, timestamp) {
        var timestampValue = new Date(dateValue).getTime();
        return timestampValue < timestamp;
      }
    },
    afterDate: {
      text: 'After',
      name: 'afterDate',
      compareFunc: function(dateValue, timestamp) {
        var timestampValue = new Date(dateValue).getTime();
        return timestampValue > timestamp;
      }
    },
    isEmpty: {
      text: 'Is Empty',
      name: 'isEmpty',
      compareFunc: function(value) {
        return value === null || value === '' || value === undefined ||
            (_.isArray(value) && _.isEmpty(value));
      }
    },
    between: {
      text: 'Between',
      name: 'between',
      compareFunc: function(value1, value2, value3) {
        return value2 <= value1 && value1 < value3;
      }
    },
    isTrue: {
      text: 'Is True',
      name: 'isTrue',
      compareFunc: function(value) {
        return value === true;
      }
    },
    isFalse: {
      text: 'Is False',
      name: 'isFalse',
      compareFunc: function(value) {
        return value === false;
      }
    }
  }
};
