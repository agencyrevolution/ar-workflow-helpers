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
          a1: [
            {
              txtValue: 'Text1',
              boolValue: false,
              numValue: 0
            }
          ],
          a2: 4343
        },
        b: {
          c: {
            txtValue: 'Text2'
          },
          d: 1
        }
      },
      {
        a: {
          a1: [
            {
              txtValue: 'Text3',
              boolValue: false,
              numValue: 10
            }
          ],
          a2: 43
        },
        b: {
          c: {
            txtValue: 'Text4'
          },
          d: 6554
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
              isArray: true
            },
            {
              name: 'boolValue',
              isArray: false
            }
          ],
          operator: 'equal',
          value: false
        },
        {
          fields: [
            {
              name: 'b',
              isArray: false
            },
            {
              name: 'c',
              isArray: false
            },
            {
              name: 'txtValue',
              isArray: false
            }
          ],
          operator: 'equal',
          value: 'Text4'
        }
      ],
      matchType: 'all'
    };

    var matches = ruleEngine.findMatches(rule, array);
    matches.should.have.lengthOf(1);

    var match = _.first(matches);
    match.b.c.should.have.property('txtValue', 'Text4');
  });

});
