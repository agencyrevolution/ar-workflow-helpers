'use strict';

var _ = require('lodash');

var config = require('./config');
var operators = config.operators;


/**
 * Rule engine class
 * @param {object} options Options
 * @return {class}
 */
var RuleEngine = function(options) {

  var logger = options ? options.logger : console;


  /*
   * Filter by matchType
   */
  var filterByMatchType = function(matchesList, matchType) {

    switch (matchType) {
      case 'any':
        return _.uniq(_.flatten(matchesList));

      default:
        var intersectItems = _.first(matchesList);
        var rest = _.rest(matchesList);

        if (rest.length) {
          rest.map(function(items) {
            intersectItems = _.intersection(intersectItems, items);
          });
        }
        return intersectItems;
    }
  };


  /**
   * Get possible values from item by fields
   * Values can be arrays or objects or strings or booleans or numbers or null
   *
   * @param  {object} item    An object or an array
   * @param  {array} fields  Array of fields
   * @param  {boolean} ignoreFlatten Should ignore flatten array or array
   * @return {array}
   */
  var getValues = function(item, fields, ignoreFlatten) {
    var _chain = _.chain(item);
    var isParentFieldArray = _.isArray(item);
    var fieldCount = fields.length;

    // iterate through fields
    for (var i = 0; i < fieldCount; i++) {

      var field = fields[i];
      var isLastField = (i === fieldCount - 1);

      if (isParentFieldArray) {
        // array of array
        _chain = _chain.map(field.name);
        if (!isLastField || !ignoreFlatten) {
          // flatten array of array to an array if not last field
          _chain = _chain.flatten();
        }
      } else {
        // array
        _chain = _chain.result(field.name);
      }

      if (field.isArray) {
        isParentFieldArray = true;
      }
    }

    return _chain.value();
  };


  /*
   * If values is an array, check if at least one of values satifies compare function
   * Otherwise, just check if values satisfies compare function
   */
  var checkValues = function(compareFunc, values, value2, value3) {
    if (!_.isArray(values)) {
      return compareFunc(values, value2, value3);
    }

    var filteredValues = _.filter(values, function(val) {
      return compareFunc(val, value2, value3);
    });

    return filteredValues.length;
  };


  /*
   * If dateValues is an array, check if at least one of date values satisfies compare function
   * Otherwise, just check if dateValues satisfies compare function
   */
  var checkDateValues = function(compareFunc, dateValues, fromTimeStamp, toTimestamp) {
    return checkValues(compareFunc, dateValues, fromTimeStamp, toTimestamp);
  };


  /*
   * Check if an item is matched
   */
  var isMatch = function(item, fields, operator, value) {

    try {
      // get available values
      var values = getValues(item, fields, true);

      // compare function
      var compareFunc = operators[operator].compareFunc;

      switch (operator) {
        case operators.equal.name:
        case operators.notEqual.name:
        case operators.lessThanOrEqual.name:
        case operators.lessThan.name:
        case operators.greaterThan.name:
        case operators.greaterThanOrEqual.name:
        case operators.startWith.name:
        case operators.contain.name:
        case operators.isTrue.name:
        case operators.isFalse.name:
        case operators.equalDate.name:
        case operators.beforeDate.name:
        case operators.afterDate.name:
          return checkValues(compareFunc, values, value);

        case operators.isEmpty.name:
          return compareFunc(values);

        case operators.between.name:
          return checkValues(compareFunc, values, value.from, value.to);

        case operators.betweenDate.name:
          return checkDateValues(compareFunc, values, value.from, value.to);

        default:
          return false;
      }
    } catch (e) {
      if (logger) {
        var logsStrings = [
          'RuleEngine - isMatch()',
          'Error message: ' + e.message || e,
          'fields: ' + JSON.stringify(fields),
          'operator: ' + operator,
          'value: ' + value
        ];
        logger.error(logsStrings.join('\n\t'), '\n');
      }
    }

    return false;
  };


  /*
   * Find matches by condition
   */
  var findMatchesByCondition = function(condition, array) {
    var fields = condition.fields;
    var operator = condition.operator;
    var value = condition.value;

    return _.filter(array, function(item) {
      return isMatch(item, fields, operator, value);
    });
  };


  /*
   * Find items in array that match the rule's conditions
   * For each condition, return a array of matched items
   */
  var findMatchesListByConditions = function(conditions, array, callback) {
    return _.map(conditions, function(condition) {
      return findMatchesByCondition(condition, array);
    });
  };


  /*
   * Find matched items from an array
   */
  var findMatches = function(rule, array) {
    if (!rule || !rule.conditions || !rule.conditions.length || !array || !array.length) {
      return [];
    }

    // find matches list by conditions
    var matchesList = findMatchesListByConditions(rule.conditions, array);

    return filterByMatchType(matchesList, rule.matchType);
  };


  return {
    getValues: getValues,
    findMatches: findMatches
  };
};


/**
 * Module export
 * @type {class}
 */
module.exports = RuleEngine;
