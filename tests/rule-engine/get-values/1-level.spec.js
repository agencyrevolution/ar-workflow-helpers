'use strict';

var _ = require('lodash');

var arWorkflowHelpers = require('../../../');

var RuleEngine = arWorkflowHelpers.RuleEngine;
var ruleEngine = new RuleEngine({logger: console});


describe('# ruleEngine.getValues(item, fields) - 1 field level', function() {

  it('level 1: array', function() {
    var array = [
      {
        id: 1,
        clientTypes: ['Personal', 'Commercial']
      },
      {
        id: 2,
        clientTypes: ['Personal']
      },
      {
        id: 3,
        clientTypes: ['Financial', 'Commercial']
      }
    ];

    var fields = [
      {
        name: 'clientTypes',
        isArray: true
      }
    ];

    var values = ruleEngine.getValues(array, fields, true);

    values.should.have.lengthOf(3);
    values[0].should.equal(array[0].clientTypes);
    values[1].should.equal(array[1].clientTypes);
    values[2].should.equal(array[2].clientTypes);
  });


  it('level 1: string', function() {
    var array = [
      {
        id: 1,
        status: 'Active'
      },
      {
        id: 2,
        status: 'Inactive'
      },
      {
        id: 3,
        status: 'Active'
      }
    ];

    var fields = [
      {
        name: 'status',
        isArray: false
      }
    ];

    var values = ruleEngine.getValues(array, fields, true);

    values.should.containEql('Active')
        .and.containEql('Inactive');
  });


  it('level 1: boolean', function() {
    var array = [
      {
        id: 1,
        isActive: false
      },
      {
        id: 2,
        isActive: false
      }
    ];

    var fields = [
      {
        name: 'isActive',
        isArray: false
      }
    ];

    var values = ruleEngine.getValues(array, fields, true);

    values.should.containEql(false);
  });


  it('level 1: number', function() {
    var array = [
      {
        id: 1,
        activePolicyCount: 100
      },
      {
        id: 2,
        activePolicyCount: 10
      }
    ];

    var fields = [
      {
        name: 'activePolicyCount',
        isArray: false
      }
    ];

    var values = ruleEngine.getValues(array, fields, true);

    values.should.containEql(100)
        .and.containEql(10);
  });
});
