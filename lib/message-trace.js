/**
 * Module export
 * @type {Object}
 */
module.exports = {
  topic: 'MessageTrace',
  states: {
    sent: {
      code: 0,
      name: 'SENT'
    },
    fetched: {
      code: 1,
      name: 'FETCHED'
    },
    committed: {
      code: 2,
      name: 'COMMITTED'
    },
    retried: {
      code: 3,
      name: 'RETRIED'
    },
    failed: {
      code: 4,
      name: 'FAILED'
    },
    succeeded: {
      code: 5,
      name: 'SUCCEEDED'
    }
  }
};
