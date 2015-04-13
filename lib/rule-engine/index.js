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

  var logger = options ? options.logger : null;


  /*
   * Filter by matchType
   */
  var filterByMatchType = function(matchesList, matchType) {

    switch (matchType) {
      case 'any':
        return _.uniq(_.flatten(matchesList));

      case 'all':
        var intersectItems = _.first(matchesList);
        var rest = _.rest(matchesList);

        if (rest.length) {
          rest.map(function(items) {
            intersectItems = _.intersection(intersectItems, items);
          });
        }
        return intersectItems;

      default:
        return [];
    }
  };


  /*
   * Get values by fields
   * Values can be an array or object or string or boolean or number or null
   */
  var getValues = function(item, fields) {
    var _chain = _.chain(item);
    var isParentFieldArray = false;

    _.each(fields, function(field) {
      if (field.isArray) {
        // if parent field is an array
        _chain = (isParentFieldArray) ? _chain.map(field.name).flatten() : _chain.result(field.name);
        isParentFieldArray = true;
      } else {
        _chain = (isParentFieldArray) ? _chain.map(field.name) : _chain.result(field.name);
      }
    });

    return _chain.value();
  };


  /*
   * If values is an array, check if at least one of values satifies compare function
   * Otherwise, just check if values satisfies compare function
   */
  var checkValues = function(compareFunc, values, value) {
    if (!_.isArray(values)) {
      return compareFunc(values, value);
    }

    var filteredValues = _.filter(values, function(val) {
      return compareFunc(val, value);
    });

    return filteredValues.length;
  };


  /*
   * If dateValues is an array, check if at least one of date values satisfies compare function
   * Otherwise, just check if dateValues satisfies compare function
   */
  var checkDateValues = function(compareFunc, dateValues, dateValue2, dateValue3) {
    if (!_.isArray(dateValues)) {
      return compareFunc(dateValues, dateValue2, dateValue3);
    }

    var filteredValues = _.filter(dateValues, function(dateValue) {
      return compareFunc(dateValue, dateValue2, dateValue3);
    });

    return filteredValues.length;
  };


  /*
   * Check if an item is matched
   */
  var isMatch = function(item, fields, operator, value) {

    try {
      // get available values
      var values = getValues(item, fields);

      switch (operator) {
        case operators.equal.name:
        case operators.notEqual.name:
        case operators.lessThanOrEqual.name:
        case operators.lessThan.name:
        case operators.greaterThan.name:
        case operators.greaterThanOrEqual.name:
        case operators.equalDate.name:
          return checkValues(operators[operator].compareFunc, values, value);

        case operators.betweenDate:
          return checkDateValues(operators[operators.compareFunc], values, value.fromDate, value.toDate);

        case operators.beforeDate:
          return checkDateValues(operators[operators.compareFunc], values, value.toDate);

        case operators.afterDate:
          return checkDateValues(operators[operators.compareFunc], values, value.fromDate);

        default:
          return false;
      }
    } catch (e) {
      logger && logger.error('Unknown error occurred', e.message, item, fiels, operators, value);
    }
  };


  /*
   * Find matches by condition
   */
  var findMatchesByCondition = function(condition, array) {
    var operator = condition.operator;
    var value = condition.value;
    var fields = condition.fields;

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
      var startedAt = Date.now();

      logger && logger.debug('Beginning JSONSelect processing');
      var matches = findMatchesByCondition(condition, array);
      logger && logger.debug('JSONSelect End, time processing:', Date.now() - startedAt);

      return matches;
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
    findMatches: findMatches
  };
};


/**
 * Module export
 * @type {class}
 */
module.exports = RuleEngine;
