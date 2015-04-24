var Q = require('q');
var _ = require('lodash');
var request = require('request');

var ECONN_REFUSED = 'ECONNREFUSED';
var SUCCESS_STATUS_CODES = [200, 201, 204];

// /api/tokens/:token
// props: {
//   params: {
//    token: "2334343",
//    skip: 0,
//    limit: 10
//   }
// }
// --> /api/tokens/2334343?skip=0&limit=10
//
var resolvePath = function(path, props) {

  var uri = path;
  var queryStrings = [];

  // replace path by props.params
  if (props.params) {
    for (var key in props.params) {
      var param = ':' + key;
      var value = props.params[key];
      if (typeof value === 'string') {
        value = encodeURIComponent(value);
      }
      if (uri.indexOf(param) >= 0) {
        uri = uri.replace(param, value);
      } else {
        queryStrings.push([key, value].join('='));
      }
    }
  }
  if (queryStrings.length) {
    uri += '?' + queryStrings.join('&');
  }
  return uri;
};


/**
 * Service class
 * @param {object} config
 * @return {object}
 */
var Service = function(config) {

  /*
   * Sample config
   * {
   *   services: {
   *     mapper: {
   *       endpoints: "http://localhost:1245,http://localhost:4345",
   *       api: {
   *         'mapper.initCache': {
   *           path: '/api/realms/:realmId/lists/:listId/init-cache',
   *           method: 'post'
   *         }
   *       }
   *     }
   *   },
   *   logger: <log object>
   * }
   */

  var logger = config.logger;
  var servicesConfig = config.services;
  var lastEndpointIndexes = {};
  var lastFailedEndpoints = [];

  // initialize index of last sent endpoint
  for (var sName in servicesConfig) {
    lastEndpointIndexes[sName] = 0;
  }

  return {
    send: function(serviceName, apiName, props, callback, deferred) {
      if (!deferred) {
        deferred = Q.defer();
      }

      // log for troubleshooting
      var log = function(logLevel, messages) {
        messages = _.union([
          'Service.send(serviceName, apiName, props)',
          'serviceName: ' + serviceName,
          'apiName: ' + apiName,
          'props: ' + JSON.stringify(props)
        ], messages);
        return logger && logger[logLevel](messages.join('\n\t'), '\n');
      };

      // reject promise!
      function rejectPromise(message) {
        log('error', [message]);
        deferred.reject(message);
        return deferred.promise.nodeify(callback);
      }

      log('debug');

      var serviceConfig = servicesConfig[serviceName];
      if (!serviceConfig) {
        return rejectPromise('Cannot find ' + serviceName + ' service from config.services');
      }

      var endpoints = serviceConfig.endpoints.split(',');
      if (!endpoints || !endpoints.length) {
        return rejectPromise('No endpoints found for ' + serviceName + ' service!');
      }

      var apiConfig = serviceConfig.api;
      if (!apiConfig) {
        return rejectPromise('No api found for ' + serviceName + ' service!');
      }

      var apiEntry = apiConfig[apiName];
      if (!apiEntry) {
        return rejectPromise('No api entry found for ' + serviceName + '["' + apiName + '"]');
      }

      var self = this;
      var method = apiEntry.method;
      var path = resolvePath(apiEntry.path, props);
      if (lastEndpointIndexes[serviceName] >= endpoints.length - 1) {
        lastEndpointIndexes[serviceName] = 0;
      } else {
        lastEndpointIndexes[serviceName]++;
      }

      // current endpoint (e.g. http://localhost:1232)
      var currentEndpoint = endpoints[lastEndpointIndexes[serviceName]];

      var options = {
        uri: currentEndpoint + path,
        method: method,
        json: props.data || {},
        headers: props.headers || {}
      };

      log('debug', ['request options: ' + JSON.stringify(options)]);

      // handle response
      var handleResponse = function(err, res, body) {

        if (err) {
          log('error', ['Error: ' + err]);

          if (err.code !== ECONN_REFUSED) {
            return deferred.reject({
              message: err,
              statusCode: 500
            });
          }

          // track list of consecutive failed endpoints
          lastFailedEndpoints = _.union(lastFailedEndpoints, [currentEndpoint]);

          if (lastFailedEndpoints.length >= endpoints.length) {
            return deferred.reject({
              message: 'All endpoints are down! ' + endpoints,
              statusCode: 500
            });
          }

          log('debug', ['Trying with another endpoint...']);
          return self.send(serviceName, apiName, props, callback, deferred);
        }

        if (!_.contains(SUCCESS_STATUS_CODES, res.statusCode)) {
          log('error', [
            'statusCode: ' + res.statusCode,
            'res body: ' + JSON.stringify(body)
          ]);
          return deferred.reject({
            message: body ? JSON.stringify(body) : 'Error sending request',
            statusCode: res.statusCode
          });
        }

        // mark as success
        lastFailedEndpoints = [];
        deferred.resolve(body);
      };

      // send request
      request(options, handleResponse);

      return deferred.promise.nodeify(callback);
    }
  };
};


/**
 * Module export
 * @type {object}
 */
module.exports = Service;
