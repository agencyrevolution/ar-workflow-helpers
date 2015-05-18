'use strict';

let rethinkdbConfig = require('../config').rethinkdbConfig;

let r = require('rethinkdbdash')(rethinkdbConfig);

r.setArrayLimit(1000000);

let handleDbResult = function(dbRes) {
  let returnValue = {
    error: null,
    result: null
  };

  if (dbRes && dbRes.errors && dbRes.first_error) {
    returnValue.error = dbRes.first_error;
  }

  returnValue.result = dbRes;
  return returnValue;
};


/**
 * Export singleton instance and Rethinkdb class
 * @return {Object}
 */
module.exports = {
  r: r,

  /**
   * Ensure table was created
   * @param  {string}   tableName the table name
   * @param  {Object}   options   the database options
   * @param  {Function} callback  the callback
   * @return {Object}             object containing the result/error if any
   */
  ensureTable: function *(tableName, options, callback) {
    logger.info('ensureTable()');

    let returnValue = {
      error: null,
      result: null
    };

    try {
      returnValue.result = yield r.tableCreate(tableName, options).run();
    } catch (e) {
      logger.error('ensureTable(): ', e);
      returnValue.error = e;
    }

    return returnValue;
  },


  /**
   * Get document by id
   * @return {Object} object containing the result/error if any
   */
  getDocument: function *(tableName, id) {
    logger.info('rethinkdb - getDocument(tableName, id)',
        '\n\t tableName: ', tableName,
        '\n\t id: ', id);

    let returnValue = {
      error: null,
      result: null
    };

    try {
      // logger.info('Connection count: ', r.getPool().getLength());
      returnValue.result = yield r.table(tableName).get(id).run();
    } catch (e) {
      logger.error('rethinkdb - getDocument(tableName, id)',
          '\n\t tableName: ', tableName,
          '\n\t id: ', id,
          '\n\t error: ', e.message);
      returnValue.error = e;
    }

    return returnValue;
  },

  /**
   * Insert document
   * @return {Object} object containing the result/error if any
   */
  insertDocument: function *(tableName, document, options) {
    let returnValue = {
      error: null,
      result: null
    };

    if (!options) {
      options = rethinkdbConfig.insertOptions;
    }

    try {
      let dbRes = yield r.table(tableName).insert(document, options).run();
      returnValue = handleDbResult(dbRes);
    } catch (e) {
      logger.error('insertDocument(): ', tableName, document, options, e);
      returnValue.error = e;
    }

    return returnValue;
  },


  /**
   * Get a list of document
   * @return {Object} object containing the result/error if any
   */
  filterDocuments: function *(tableName, propName, propValue) {
    let returnValue = {
      error: null,
      result: null
    };

    try {
      let dbRes = yield r.table(tableName).filter(r.row(propName).eq(propValue)).run();
      returnValue = handleDbResult(dbRes);
    } catch (e) {
      logger.error('filterDocuments(): ', e);
      returnValue.error = e;
    }

    return returnValue;
  },

  /*
   * Replace a document with a new one
   */
  replaceDocument: function *(tableName, id, replaceContent, options) {
    let returnValue = {
      error: null,
      result: null
    };

    if (!options) {
      options = {};
    }

    try {
      replaceContent.id = id;
      let dbRes = yield r.table(tableName).get(id).replace(replaceContent, options).run();
      returnValue = handleDbResult(dbRes);
    } catch (e) {
      logger.error('replaceDocument(): ', e);
      returnValue.error = e;
    }

    return returnValue;
  },


  /**
   * Update document by id with updateContent
   * @return {Object} object containing the result/error if any
   */
  updateDocument: function *(tableName, id, updateContent, options) {
    let returnValue = {
      error: null,
      result: null
    };

    if (!options) {
      options = {};
    }

    try {
      let dbRes = yield r.table(tableName).get(id).update(updateContent, options).run();
      returnValue = handleDbResult(dbRes);
    } catch (e) {
      logger.error('updateDocument(): ', e);
      returnValue.error = e;
    }

    return returnValue;
  },


  /**
   * Delete document by id
   * @return {Object} object containing the result/error if any
   */
  deleteDocument: function *(tableName, id, options) {
    let returnValue = {
      error: null,
      result: null
    };

    if (!options) {
      options = {};
    }

    try {
      let dbRes = yield r.table(tableName).get(id). delete(options);
      returnValue = handleDbResult(dbRes);
    } catch (e) {
      logger.error('deleteDocument(): ', e);
      returnValue.error = e;
    }

    return returnValue;
  },

  /*
   * Build select field query
   * Had to copy code from account.js due to weird error if move this one to rethinkdb.js
   */
  buildSelectQuery: function(query, fields) {
    for (let i = 0; i < fields.length; i++) {
      if (fields[i].isArray) {
        query = query(fields[i].name)
            .reduce(function(left, right) {
              return left.add(right);
            });
      } else {
        query = query(fields[i].name);
      }
    }
    query = query.distinct();

    return query;
  },

  /*
   * Handle the query, return correct format
   */
  handleQuery: function *(query, getOptions, log) {
    let returnValue = {
      error: null,
      result: null
    };

    if (getOptions && getOptions.count) {
      query = query.count();
    } else if (getOptions && getOptions.skip >= 0 && getOptions.limit) {
      query = query.skip(getOptions.skip).limit(getOptions.limit);
    }

    try {
      let dbRes = yield query.run();
      returnValue = handleDbResult(dbRes);
    } catch (e) {
      logger.error(log, '\n\t handleQuery - handleQuery(): ', e);
      returnValue.error = e;
    }

    return returnValue;
  },


  /*
   * Get last modified document
   */
  getLastModifiedDocument: function *(tableName, listId) {
    let query = r.table(tableName)
        .getAll(listId, {index: 'listId'})
        .orderBy(r.desc('lastModifiedAt'))
        .nth(0)
        .default(null);
    return yield this.handleQuery(query);
  },


  /*
   * Clear data for all tables
   */
  clear: function *() {
    let query = r.tableList().forEach(function(tableName) {
      return r.table(tableName).delete();
    });
    return yield this.handleQuery(query);
  }
};
