var events = require('events');
var util = require('util');


/**
 * @constructor
 */
var Receiver = function () {
  events.EventEmitter.call(this);
};

util.inherits(Receiver, events.EventEmitter);


Receiver.prototype.handleRequest = function (target, req, res) {
  this.emit('request', target, req, res);
};


module.exports = Receiver;
