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


  it('field 1: array, operator: contain', function() {

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
        },
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


});
