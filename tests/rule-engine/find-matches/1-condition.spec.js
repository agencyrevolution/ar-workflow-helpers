'use strict';

var _ = require('lodash');

var arWorkflowHelpers = require('../../../');
var config = require('../../../lib/rule-engine/config');

var operators = config.operators;
var RuleEngine = arWorkflowHelpers.RuleEngine;
var ruleEngine = new RuleEngine({logger: console});


describe('# ruleEngine.findMatches(rule, array) -  1 condition - 1 field', function() {

  var now = Date.now();
  var twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;
  var nextTwoDays = now + 2 * 24 * 60 * 60 * 1000;

  var array = [
    {
      id: 1,
      clientTypes: ['Personal', 'Commercial'],
      isEmptyArray: [],
      status: 'Active',
      count: 2,
      isActive: true,
      effectiveAt: now,
    },
    {
      id: 2,
      clientTypes: ['Personal'],
      isEmptyArray: [1],
      status: 'Inactive',
      count: 10,
      isActive: false,
      effectiveAt: twoDaysAgo
    },
    {
      id: 3,
      clientTypes: ['Financial', 'Commercial'],
      isEmptyArray: null,
      status: 'Active',
      count: 5,
      isActive: false,
      effectiveAt: nextTwoDays
    }
  ];


  it('field 1: array, operator: containAny', function() {

    var rule = {
      conditions: [
        {
          fields: [
            {
              name: 'clientTypes',
              isArray: true
            }
          ],
          operator: operators.containAny.name,
          value: ['Commercial']
        }
      ],
      matchType: 'all'
    };

    var matches = ruleEngine.findMatches(rule, array);

    matches.should.have.lengthOf(2);
    matches[0].should.have.property('id', array[0].id);
    matches[1].should.have.property('id', array[2].id);
  });


  it('field 1: array, operator: isEmpty', function() {

    var rule = {
      conditions: [
        {
          fields: [
            {
              name: 'isEmptyArray',
              isArray: true
            }
          ],
          operator: operators.isEmpty.name
        }
      ],
      matchType: 'all'
    };

    var matches = ruleEngine.findMatches(rule, array);

    matches.should.have.lengthOf(2);
    matches[0].should.have.property('id', array[0].id);
    matches[1].should.have.property('id', array[2].id);
  });



  it('field 1: string, operator: equal', function() {

    var rule = {
      conditions: [
        {
          fields: [
            {
              name: 'status',
              isArray: false
            }
          ],
          operator: operators.equal.name,
          value: 'Inactive'
        }
      ],
      matchType: 'all'
    };

    var matches = ruleEngine.findMatches(rule, array);
    matches.should.have.lengthOf(1);

    matches[0].should.have.property('id', array[1].id);
  });


  it('field 1: string, operator: notEqual', function() {

    var rule = {
      conditions: [
        {
          fields: [
            {
              name: 'status',
              isArray: false
            }
          ],
          operator: operators.notEqual.name,
          value: 'Inactive'
        }
      ],
      matchType: 'all'
    };

    var matches = ruleEngine.findMatches(rule, array);

    matches.should.have.lengthOf(2);
    matches[0].should.have.property('id', array[0].id);
    matches[1].should.have.property('id', array[2].id);
  });


  it('field 1: string, operator: contain', function() {

    var rule = {
      conditions: [
        {
          fields: [
            {
              name: 'status',
              isArray: false
            }
          ],
          operator: operators.contain.name,
          value: 'tive'
        }
      ],
      matchType: 'all'
    };

    var matches = ruleEngine.findMatches(rule, array);

    matches.should.have.lengthOf(3);
    matches[0].should.have.property('id', array[0].id);
    matches[1].should.have.property('id', array[1].id);
    matches[2].should.have.property('id', array[2].id);
  });


  it('field 1: string, operator: startWith', function() {

    var rule = {
      conditions: [
        {
          fields: [
            {
              name: 'status',
              isArray: false
            }
          ],
          operator: operators.startWith.name,
          value: 'A'
        }
      ],
      matchType: 'all'
    };

    var matches = ruleEngine.findMatches(rule, array);

    matches.should.have.lengthOf(2);
    matches[0].should.have.property('id', array[0].id);
    matches[1].should.have.property('id', array[2].id);
  });


  it('field 1: number, operator: lessThan', function() {

    var rule = {
      conditions: [
        {
          fields: [
            {
              name: 'count',
              isArray: false
            }
          ],
          operator: operators.lessThan.name,
          value: 10
        }
      ],
      matchType: 'all'
    };

    var matches = ruleEngine.findMatches(rule, array);

    matches.should.have.lengthOf(2);
    matches[0].should.have.property('id', array[0].id);
    matches[1].should.have.property('id', array[2].id);
  });


  it('field 1: number, operator: lessThanOrEqual', function() {

    var rule = {
      conditions: [
        {
          fields: [
            {
              name: 'count',
              isArray: false
            }
          ],
          operator: operators.lessThanOrEqual.name,
          value: 2
        }
      ],
      matchType: 'all'
    };

    var matches = ruleEngine.findMatches(rule, array);

    matches.should.have.lengthOf(1);
    matches[0].should.have.property('id', array[0].id);
  });


  it('field 1: number, operator: greaterThan', function() {

    var rule = {
      conditions: [
        {
          fields: [
            {
              name: 'count',
              isArray: false
            }
          ],
          operator: operators.greaterThan.name,
          value: 2
        }
      ],
      matchType: 'all'
    };

    var matches = ruleEngine.findMatches(rule, array);

    matches.should.have.lengthOf(2);
    matches[0].should.have.property('id', array[1].id);
    matches[1].should.have.property('id', array[2].id);
  });


  it('field 1: number, operator: greaterThanOrEqual', function() {

    var rule = {
      conditions: [
        {
          fields: [
            {
              name: 'count',
              isArray: false
            }
          ],
          operator: operators.greaterThanOrEqual.name,
          value: 10
        }
      ],
      matchType: 'all'
    };

    var matches = ruleEngine.findMatches(rule, array);

    matches.should.have.lengthOf(1);
    matches[0].should.have.property('id', array[1].id);
  });


  it('field 1: number, operator: between', function() {

    var rule = {
      conditions: [
        {
          fields: [
            {
              name: 'count',
              isArray: false
            }
          ],
          operator: operators.between.name,
          value: {
            from: 3,
            to: 6
          }
        }
      ],
      matchType: 'all'
    };

    var matches = ruleEngine.findMatches(rule, array);

    matches.should.have.lengthOf(1);
    matches[0].should.have.property('id', array[2].id);
  });


  it('field 1: number, operator: isTrue', function() {

    var rule = {
      conditions: [
        {
          fields: [
            {
              name: 'isActive',
              isArray: false
            }
          ],
          operator: operators.isTrue.name
        }
      ],
      matchType: 'all'
    };

    var matches = ruleEngine.findMatches(rule, array);

    matches.should.have.lengthOf(1);
    matches[0].should.have.property('id', array[0].id);
  });


  it('field 1: number, operator: isFalse', function() {

    var rule = {
      conditions: [
        {
          fields: [
            {
              name: 'isActive',
              isArray: false
            }
          ],
          operator: operators.isFalse.name
        }
      ],
      matchType: 'all'
    };

    var matches = ruleEngine.findMatches(rule, array);

    matches.should.have.lengthOf(2);
    matches[0].should.have.property('id', array[1].id);
    matches[1].should.have.property('id', array[2].id);
  });


  it('field 1: date, operator: equalDate', function() {

    var rule = {
      conditions: [
        {
          fields: [
            {
              name: 'effectiveAt',
              isArray: false
            }
          ],
          operator: operators.equalDate.name,
          value: now
        }
      ],
      matchType: 'all'
    };

    var matches = ruleEngine.findMatches(rule, array);

    matches.should.have.lengthOf(1);
    matches[0].should.have.property('id', array[0].id);
  });


  it('field 1: date, operator: beforeDate', function() {

    var rule = {
      conditions: [
        {
          fields: [
            {
              name: 'effectiveAt',
              isArray: false
            }
          ],
          operator: operators.beforeDate.name,
          value: now
        }
      ],
      matchType: 'all'
    };

    var matches = ruleEngine.findMatches(rule, array);

    matches.should.have.lengthOf(1);
    matches[0].should.have.property('id', array[1].id);
  });


  it('field 1: date, operator: afterDate', function() {

    var rule = {
      conditions: [
        {
          fields: [
            {
              name: 'effectiveAt',
              isArray: false
            }
          ],
          operator: operators.afterDate.name,
          value: now
        }
      ],
      matchType: 'all'
    };

    var matches = ruleEngine.findMatches(rule, array);

    matches.should.have.lengthOf(1);
    matches[0].should.have.property('id', array[2].id);
  });


  it('field 1: date, operator: betweenDate', function() {

    var rule = {
      conditions: [
        {
          fields: [
            {
              name: 'effectiveAt',
              isArray: false
            }
          ],
          operator: operators.betweenDate.name,
          value: {
            from: now + 12,
            to: nextTwoDays + 23232
          }
        }
      ],
      matchType: 'all'
    };

    var matches = ruleEngine.findMatches(rule, array);

    matches.should.have.lengthOf(1);
    matches[0].should.have.property('id', array[2].id);
  });

});
