'use strict';

var _ = require('lodash');

var arWorkflowHelpers = require('../../');

var RuleEngine = arWorkflowHelpers.RuleEngine;
var ruleEngine = new RuleEngine({logger: console});


describe('# ruleEngine.findMatches(rule, array) - 1 condition - 2 property levels', function() {

  it('Should match 3nd item', function() {

    var array = [
      {
        a: [
          {
            txtValue: 'Text1',
            boolValue: true,
            numValue: 0
          }
        ]
      },
      {
        a: [
          {
            txtValue: 'Text2',
            boolValue: false,
            numValue: 12
          }
        ]
      },
      {
        a: [
          {
            txtValue: 'Text3',
            boolValue: true,
            numValue: 232
          }
        ]
      }
    ];

    var rule = {
      conditions: [
        {
          fields: [
            {
              name: 'a',
              isArray: true
            },
            {
              name: 'numValue',
              isArray: false
            }
          ],
          operator: 'equal',
          value: 232
        }
      ],
      matchType: 'all'
    };

    var matches = ruleEngine.findMatches(rule, array);
    matches.should.have.lengthOf(1);

    var matchedNode = _.first(matches);
    matchedNode.a[0].should.have.property('numValue', 232);
  });


  it('Should match 1st & 2nd items', function() {

    var array = [
      {
        a: [
          {
            txtValue: 'Text1',
            boolValue: true,
            numValue: 0
          }
        ]
      },
      {
        a: [
          {
            txtValue: 'Text2',
            boolValue: false,
            numValue: 12
          }
        ]
      },
      {
        a: [
          {
            txtValue: 'Text3',
            boolValue: true,
            numValue: 232
          }
        ]
      }
    ];

    var rule = {
      conditions: [
        {
          fields: [
            {
              name: 'a',
              isArray: true
            },
            {
              name: 'numValue',
              isArray: false
            }
          ],
          operator: 'notEqual',
          value: 232
        }
      ],
      matchType: 'all'
    };

    var matches = ruleEngine.findMatches(rule, array);
    matches.should.have.lengthOf(2);

    var firstNode = _.first(matches);
    var firstA = firstNode.a[0];
    firstA.should.have.property('txtValue', 'Text1');
    firstA.should.have.property('boolValue', true);
    firstA.should.have.property('numValue', 0);

    var secondNode = matches[1];
    var firstA = secondNode.a[0];
    firstA.should.have.property('txtValue', 'Text2');
    firstA.should.have.property('boolValue', false);
    firstA.should.have.property('numValue', 12);
  });

});
