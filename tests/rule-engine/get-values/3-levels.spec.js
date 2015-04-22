'use strict';

var _ = require('lodash');

var arWorkflowHelpers = require('../../../');

var RuleEngine = arWorkflowHelpers.RuleEngine;
var ruleEngine = new RuleEngine({logger: console});


describe('# ruleEngine.getValues(item, fields) - 3 field levels', function() {

  it('level 1: array, level 2: array, level 3: array', function() {

    var array = [
      {
        id: 1,
        policies: [
          {
            types: [
              {
                items: ['A', 'B']
              }
            ]
          }
        ]
      },
      {
        id: 2,
        policies: [
          {
            types: [
              {
                items: ['C', 'D']
              },
              {
                items: ['E', 'F']
              }
            ]
          }
        ]
      }
    ];

    var fields = [
      {
        name: 'policies',
        isArray: true
      },
      {
        name: 'types',
        isArray: true
      },
      {
        name: 'items',
        isArray: true
      }
    ];

    var matches = ruleEngine.getValues(array, fields, true);

    matches.should.containEql(['A', 'B'])
        .and.containEql(['C', 'D'])
        .and.containEql(['E', 'F']);

    matches = ruleEngine.getValues(array, fields);

    matches.should.containEql('A')
        .and.containEql('B')
        .and.containEql('C')
        .and.containEql('D')
        .and.containEql('E')
        .and.containEql('F');
  });


  it('level 1: array, level 2: array, level 3: string', function() {

    var array = [
      {
        id: 1,
        policies: [
          {
            types: [
              {
                item: 'A'
              }
            ]
          }
        ]
      },
      {
        id: 2,
        policies: [
          {
            types: [
              {
                item: 'B'
              },
              {
                item: 'C'
              }
            ]
          }
        ]
      }
    ];

    var fields = [
      {
        name: 'policies',
        isArray: true
      },
      {
        name: 'types',
        isArray: true
      },
      {
        name: 'item',
        isArray: false
      }
    ];

    var matches = ruleEngine.getValues(array, fields, true);

    matches.should.containEql('A')
        .and.containEql('B')
        .and.containEql('C');

    matches = ruleEngine.getValues(array, fields);

    matches.should.containEql('A')
        .and.containEql('B')
        .and.containEql('C');
  });


  it('level 1: array, level 2: array, level 3: boolean', function() {

    var array = [
      {
        id: 1,
        policies: [
          {
            types: [
              {
                item: true
              }
            ]
          }
        ]
      },
      {
        id: 2,
        policies: [
          {
            types: [
              {
                item: true
              },
              {
                item: false
              }
            ]
          }
        ]
      }
    ];

    var fields = [
      {
        name: 'policies',
        isArray: true
      },
      {
        name: 'types',
        isArray: true
      },
      {
        name: 'item',
        isArray: false
      }
    ];

    var matches = ruleEngine.getValues(array, fields, true);

    matches.should.containEql(true)
        .and.containEql(false);

    matches = ruleEngine.getValues(array, fields);

    matches.should.containEql(true)
        .and.containEql(false);
  });


  it('level 1: array, level 2: array, level 3: number', function() {

    var array = [
      {
        id: 1,
        policies: [
          {
            types: [
              {
                item: 5
              }
            ]
          }
        ]
      },
      {
        id: 2,
        policies: [
          {
            types: [
              {
                item: 4
              },
              {
                item: 5
              }
            ]
          }
        ]
      }
    ];

    var fields = [
      {
        name: 'policies',
        isArray: true
      },
      {
        name: 'types',
        isArray: true
      },
      {
        name: 'item',
        isArray: false
      }
    ];

    var matches = ruleEngine.getValues(array, fields, true);

    matches.should.containEql(5)
        .and.containEql(4);

    matches = ruleEngine.getValues(array, fields);

    matches.should.containEql(5)
        .and.containEql(4);
  });


  it('level 1: object, level 2: array, level 3: array', function() {

    var array = [
      {
        id: 1,
        policy: {
          types: [
            {
              item: ['A']
            }
          ]
        }
      },
      {
        id: 2,
        policy: {
          types: [
            {
              item: ['A']
            },
            {
              item: ['B']
            }
          ]
        }
      }
    ];

    var fields = [
      {
        name: 'policy',
        isArray: false
      },
      {
        name: 'types',
        isArray: true
      },
      {
        name: 'item',
        isArray: true
      }
    ];

    var matches = ruleEngine.getValues(array, fields, true);

    matches.should.containEql(['A'])
        .and.containEql(['B']);

    matches = ruleEngine.getValues(array, fields);

    matches.should.containEql('A')
        .and.containEql('B');
  });

});
