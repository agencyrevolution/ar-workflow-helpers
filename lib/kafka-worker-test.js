'use strict';

let _ = require('lodash');
let Q = require('q');
let RethinkdbDash = require('rethinkdbdash');
let kafka = require('kafka-node');
let thunkify = require('thunkify');
let KafkaWorker = require('./kafka-worker');


/**
 * KafkaWorkerTest Class for testing with Kafka Related Workers
 */
module.exports = class KafkaWorkerTest {

  constructor(options) {
    let rethinkdbConfig = options.rethinkdbConfig;
    let zookeeperConfig = options.zookeeperConfig;

    if (rethinkdbConfig) {
      if (rethinkdbConfig.db.indexOf('test') < 0) {
        throw new Error('The database name must have "test" word inside.');
      }

      this.r = new RethinkdbDash(rethinkdbConfig);
    }

    this.zookeeperConfig = zookeeperConfig;
    this.rethinkdbConfig = rethinkdbConfig;

    let kafkaClient = new kafka.Client(zookeeperConfig.connectionString, zookeeperConfig.clientId,
        zookeeperConfig.options);

    let kafkaProducer = new kafka.Producer(kafkaClient);

    this.producer = kafkaProducer;

    this.send = thunkify(function(payloads, callback) {
      kafkaProducer.send(payloads, callback);
    });

    this.workers = [];
  }

  ensureProducerReady() {
    let deferred = Q.defer();
    let producer = this.producer;

    if (!producer.ready) {
      producer.on('ready', function() {
        deferred.resolve(producer);
      });
    } else {
      deferred.resolve(producer);
    }

    return deferred.promise;
  }

  *sendMessages(messages) {
    yield this.ensureProducerReady();
    let payloads = messages.map(function(message) {
      return {
        topic: message.topic,
        messages: JSON.stringify(message.message)
      };
    });

    yield this.send(payloads);
  }

  *sendMessage(message) {
    yield this.sendMessages([message]);
  }

  /**
   *  Fetch Messages for the next worker
   *
   *  @param {object} worker which will consume message
   *  @param {object} filter filter which will be used to compare
   *  @param {integer} count number of message sent with current filter
   *  @return {object}
   */
  *fetchMessages(workerConfig, filter, count) {
    let deferred = Q.defer();

    let fetchedMessages = [];

    let onMessageHandler = function(message) {
      var messageValue = message.value;

      // If we don't make this commitMessage parallel with the detect code below
      // The problem can happens when next mesage is consume intermediately because of the
      // worker in app fire next message
      worker.commitMessage(message, function(err, data) {
        if (_.find([messageValue], filter)) {
          fetchedMessages.push(message);
          if (fetchedMessages.length >= count) {
            deferred.resolve(fetchedMessages);
          }
        }
      });
    };

    let worker = new KafkaWorker({
      zookeeper: this.zookeeperConfig,
      worker: workerConfig,
      messageTracking: false
    }, onMessageHandler);
    this.workers.push(worker);

    return deferred.promise;
  }


  /**
   *  Fetch Messages for the next worker
   *
   *  @param {object} worker which will consume message
   *  @param {object} filter filter which will be used to compare
   *  @param {integer} count number of message sent with current filter
   *  @return {object}
   */
  *fetchMessage(workerConfig, filter) {
    let messages = yield this.fetchMessages(workerConfig, filter, 1);
    return messages[0];
  }

  /**
   *  Wait for interval before continue
   *
   *  @param {integer} interval ms to wait for
   */
  *waitFor(interval) {
    let deferred = Q.defer();
    try {
      setTimeout(function() {
        deferred.resolve(true);
      }, interval);
    }
    catch (err) {
      deferred.reject(err);
    }
    return deferred.promise;

  }

  /**
   *  Fetch MessageValue for the next worker
   *
   *  @param {object} worker which will consume message
   *  @param {object} filter filter which will be used to compare
   *  @return {object}
   */
  *fetchMessageValue(worker, filter) {
    let message = yield this.fetchMessage(worker, filter);
    return message.value;
  }

  *tearDown() {
    // Clear Database
    yield this._clear();

    // Close all un closed workers
    let closeTasks = this.workers.map(function(worker) {
      return thunkify(worker.close)();
    });
    yield closeTasks;
  }

  *_clear() {
    if (!this.rethinkdbConfig) {
      return;
    }
    yield this.r.tableList().forEach(function(tableName) {
      return this.r.table(tableName).delete();
    }.bind(this));
  }

  /**
   * Insert data to database
   * @param {object} data Test data
   * @return {yield}
   */
  *insert(data) {
    let insertedData = {};

    for (let key in data) {
      let tableName = this.rethinkdbConfig.tables[key];
      let insertData = data[key];
      // try to insert each set of entities
      insertedData[key] = yield this._tryInsert(tableName, insertData);
    }

    return insertedData;
  }

  /**
   * Try to insert documents to rethinkdb
   */
  *_tryInsert(tableName, documents) {
    if (!documents) {
      return null;
    }
    let dbRes = yield this.r.table(tableName).insert(documents, { returnChanges: true });

    return _.isArray(documents) ? _.map(dbRes.changes, 'new_val') : dbRes.changes[0].new_val;
  }
};
