var Q = require('q');
var _ = require('lodash');
var request = require('request');


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
      if(typeof value === 'string') {
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
  var ECONN_REFUSED = 'ECONNREFUSED';

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

      log('info');

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

      var options = {
        uri: endpoints[lastEndpointIndexes[serviceName]] + path,
        method: method,
        json: props.data || {},
        headers: props.headers || {}
      };

      log('info', ['request options: ' + JSON.stringify(options)]);

      // handle response
      var handleResponse = function(err, res, body) {

        if (err) {
          log('error', ['Error: ' + err]);

          if (err.code === ECONN_REFUSED) {
            log('info', ['Trying with another endpoint...']);
            return self.send(serviceName, apiName, props, callback, deferred);
          }

          return deferred.reject({ message: err });
        }

        if (res.statusCode !== 200) {
          log('error', [
            'statusCode: ' + res.statusCode,
            'res body: ' + JSON.stringify(body)
          ]);
          if (body) {
            return deferred.reject(body);
          }
          return deferred.reject({
            message: 'Error sending request',
            statusCode: res.statusCode
          });
        }
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
