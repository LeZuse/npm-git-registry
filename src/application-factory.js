var path = require('path');

var Application = require('./application');
var Bitbucket = require('./bitbucket');
var Registry = require('./registry');
var Receiver = require('./receiver');
var Router = require('node-simple-router');


/**
 * @constructor
 */
var ApplicationFactory = function (configurator, fs, http, https) {
  this.$configurator = configurator;
  this.$fs = fs;
  this.$http = http;
  this.$https = https;
};


ApplicationFactory.prototype.createApplication = function (configurator) {
  var bitbucket = this.createBitbucketClient();
  var registry = this.createRegistry(bitbucket);

  var server = this.createServer();
  var router = this.createRouter(server);
  var receiver = this.createReceiver(router);

  var app = new Application(server, receiver, registry);
  return app;
};


ApplicationFactory.prototype.createBitbucketClient = function () {
  var bitbucket = new Bitbucket(this.$https);
  return bitbucket;
};


ApplicationFactory.prototype.createServer = function () {
  var server = this.$http.createServer();
  return server;
};


ApplicationFactory.prototype.createRegistry = function (bitbucket) {
  var registry = new Registry(bitbucket, this.$https, this.$fs);
  registry.mapScopes(this.getScopeMappings());

  return registry;
};


ApplicationFactory.prototype.createRouter = function (server) {
  var router = new Router({
    serve_static: false,
    list_dir: false,
    serve_cgi: false,
    serve_php: false,
    served_by: 'npm-git-registry',
    software_name: 'npm-git-registry'
  });

  server.on('request', router);

  return router;
};


ApplicationFactory.prototype.createReceiver = function (router) {
  var receiver = new Receiver();
  var handleRequest = receiver.handleRequest;

  var routes = this.getRoutes();
  routes.forEach(function (route) {
    var method = route.method.toLowerCase();
    var handleRoutedRequest = handleRequest.bind(receiver, route.target);
    router[method].call(router, route.pattern, handleRoutedRequest);
  });

  return receiver;
};


ApplicationFactory.prototype.getScopeMappings = function () {
  var json = this.$configurator.read('config', 'scope-mappings.json');
  var raw_mappings = JSON.parse(json);

  var mappings = {};
  Object.keys(raw_mappings).forEach(function (scope) {
    var mapping = {};
    mapping.account = raw_mappings[scope]['account'];

    if (raw_mappings[scope]['filter']) {
      mapping.filter = new RegExp(raw_mappings[scope]['filter']);
    }

    mappings[scope] = mapping;
  });

  return mappings;
};


ApplicationFactory.prototype.getRoutes = function () {
  var json = this.$configurator.read('config', 'routes.json');
  var route_map = JSON.parse(json);

  var routes = Object.keys(route_map).map(function (key) {
    var parts = key.split(' ');
    var pattern = parts.slice(1).join(' ');

    var target = route_map[key];
    if (pattern[0] === '^') {
      pattern = new RegExp(pattern);
    }

    return {
      method: parts[0],
      pattern: pattern,
      target: target
    };
  });

  return routes;
};


module.exports = ApplicationFactory;
