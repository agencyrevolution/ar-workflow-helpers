'use strict';

var _ = require('lodash');

var arWorkflowHelpers = require('../../../');

var RuleEngine = arWorkflowHelpers.RuleEngine;
var ruleEngine = new RuleEngine({logger: console});


describe('# ruleEngine.getValues(item, fields) - 2 field levels', function() {

  it('level 1: array, level 2: array', function() {

    var array = [
      {
        id: 1,
        policies: [
          {
            types: ['Auto']
          }
        ]
      },
      {
        id: 2,
        policies: [
          {
            types: ['Home']
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
      }
    ];

    var matches = ruleEngine.getValues(array, fields, true);

    matches.should.containEql(['Auto'])
        .and.containEql(['Home']);
  });


  it('level 1: array, level 2: string', function() {

    var array = [
      {
        id: 1,
        policies: [
          {
            status: 'New'
          }
        ]
      },
      {
        id: 2,
        policies: [
          {
            status: 'Renew'
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
        name: 'status',
        isArray: false
      }
    ];

    var matches = ruleEngine.getValues(array, fields, true);

    matches.should.containEql('New')
        .and.containEql('Renew');
  });



  it('level 1: array, level 2: boolean', function() {

    var array = [
      {
        id: 1,
        policies: [
          {
            isActive: false
          }
        ]
      },
      {
        id: 2,
        policies: [
          {
            isActive: true
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
        name: 'isActive',
        isArray: false
      }
    ];

    var matches = ruleEngine.getValues(array, fields, true);

    matches.should.containEql(false)
        .and.containEql(true);
  });


  it('level 1: array, level 2: number', function() {

    var array = [
      {
        id: 1,
        policies: [
          {
            premium: 123
          }
        ]
      },
      {
        id: 2,
        policies: [
          {
            premium: 433
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
        name: 'premium',
        isArray: false
      }
    ];

    var matches = ruleEngine.getValues(array, fields, true);

    matches.should.containEql(123)
        .and.containEql(433);
  });


  it('level 1: object, level 2: array', function() {

    var array = [
      {
        id: 1,
        contact: {
          phones: ['123', '456']
        }
      },
      {
        id: 2,
        contact: {
          phones: ['123', '789']
        }
      }
    ];

    var fields = [
      {
        name: 'contact',
        isArray: false
      },
      {
        name: 'phones',
        isArray: true
      }
    ];

    var matches = ruleEngine.getValues(array, fields, true);

    matches.should.containEql(['123', '456'])
        .and.containEql(['123', '789']);
  });


  it('level 1: object, level 2: string', function() {

    var array = [
      {
        id: 1,
        contact: {
          name: 'Hung'
        }
      },
      {
        id: 2,
        contact: {
          name: 'Nguyen'
        }
      }
    ];

    var fields = [
      {
        name: 'contact',
        isArray: false
      },
      {
        name: 'name',
        isArray: false
      }
    ];

    var matches = ruleEngine.getValues(array, fields, true);

    matches.should.containEql('Hung')
        .and.containEql('Nguyen');
  });


  it('level 1: object, level 2: boolean', function() {

    var array = [
      {
        id: 1,
        contact: {
          isActive: false
        }
      },
      {
        id: 2,
        contact: {
          isActive: true
        }
      }
    ];

    var fields = [
      {
        name: 'contact',
        isArray: false
      },
      {
        name: 'isActive',
        isArray: false
      }
    ];

    var matches = ruleEngine.getValues(array, fields, true);

    matches.should.containEql(false)
        .and.containEql(true);
  });


  it('level 1: object, level 2: number', function() {

    var array = [
      {
        id: 1,
        contact: {
          count: 10
        }
      },
      {
        id: 2,
        contact: {
          count: 20
        }
      }
    ];

    var fields = [
      {
        name: 'contact',
        isArray: false
      },
      {
        name: 'count',
        isArray: false
      }
    ];

    var matches = ruleEngine.getValues(array, fields, true);

    matches.should.containEql(10)
        .and.containEql(20);
  });

});
