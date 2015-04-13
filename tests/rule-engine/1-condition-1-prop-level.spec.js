'use strict';

var _ = require('lodash');

var arWorkflowHelpers = require('../../');

var RuleEngine = arWorkflowHelpers.RuleEngine;
var ruleEngine = new RuleEngine({logger: console});


describe('# ruleEngine.findMatches(rule, array) - 1 condition - property level 1', function() {

  it('Should match 2nd item', function() {

    var array = [
      { a: 1 },
      { a: 2 },
      { a: 3 }
    ];

    var rule = {
      conditions: [
        {
          fields: [
            {
              name: 'a',
              isArray: false
            }
          ],
          operator: 'equal',
          value: 2
        }
      ],
      matchType: 'all'
    };

    var matches = ruleEngine.findMatches(rule, array);
    matches.should.have.lengthOf(1);

    var matchedNode = _.first(matches);
    matchedNode.should.have.property('a', 2);
  });


  it('Should match 3rd item', function() {

    var array = [
      { a: 1 },
      { a: 2 },
      { a: 3 }
    ];

    var rule = {
      conditions: [
        {
          fields: [
            {
              name: 'a',
              isArray: false
            }
          ],
          operator: 'equal',
          value: 3
        }
      ],
      matchType: 'any'
    };

    var matches = ruleEngine.findMatches(rule, array);
    matches.should.have.lengthOf(1);

    var matchedNode = _.first(matches);
    matchedNode.should.have.property('a', 3);
  });


  it('Should match 0 item', function() {

    var array = [
      { a: 1 },
      { a: 2 },
      { a: 3 }
    ];

    var rule = {
      conditions: [
        {
          fields: [
            {
              name: 'a',
              isArray: false
            }
          ],
          operator: 'equal',
          value: 4
        }
      ],
      matchType: 'any'
    };

    var matches = ruleEngine.findMatches(rule, array);
    matches.should.be.empty;
  });

});
