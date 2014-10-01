
var Controller = require('./controller');


/**
 * @constructor
 */
var Application = function (server, receiver, registry) {
  this.$server = server;
  this.$receiver = receiver;
  this.$registry = registry;

  this.port_ = 80;
};


Application.prototype.setPort = function (port) {
  this.port_ = port;
};


Application.prototype.run = function (callback) {
  this.$receiver.on('request', this.handleRequest_.bind(this));

  this.$server.listen(this.port_, function (err) {
    if (callback) {
      callback(err);
    } else if (err) {
      throw err;
    }
  });
};


Application.prototype.handleRequest_ = function (target, req, res, d) {
  var controller = new Controller(this.$registry);

  d.run(function () {
    controller[target].call(controller, req, res, d);
  });
};


module.exports = Application;
