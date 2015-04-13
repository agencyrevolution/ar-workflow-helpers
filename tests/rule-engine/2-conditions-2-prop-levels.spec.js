'use strict';

var _ = require('lodash');

var arWorkflowHelpers = require('../../');

var RuleEngine = arWorkflowHelpers.RuleEngine;
var ruleEngine = new RuleEngine({logger: console});


describe('# ruleEngine.findMatches(rule, array) - 1 condition - 2 property levels', function() {

  it('Should match 3nd item', function() {

    var array = [
      {
        a: {
          a1: true,
          a2: 4343
        },
        b: {
          c: "23-12-2010",
          d: "AUT"
        }
      },
      {
        a: {
          a1: true,
          a2: 43
        },
        b: {
          c: "20-11-2014",
          d: "HME"
        }
      },
      {
        a: {
          a1: true,
          a2: 123
        },
        b: {
          c: "23-12-2010",
          d: "AUT"
        }
      }
    ];

    var rule = {
      conditions: [
        {
          fields: [
            {
              name: 'a',
              isArray: false
            },
            {
              name: 'a1',
              isArray: false
            }
          ],
          operator: 'equal',
          value: true
        },
        {
          fields: [
            {
              name: 'b',
              isArray: false
            },
            {
              name: 'd',
              isArray: false
            }
          ],
          operator: 'equal',
          value: 'AUT'
        }
      ],
      matchType: 'all'
    };

    var matches = ruleEngine.findMatches(rule, array);
    matches.should.have.lengthOf(2);

    console.log(JSON.stringify(matches));
  });

});
