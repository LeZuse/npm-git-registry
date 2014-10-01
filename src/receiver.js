var domain = require('domain');
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
  var d = domain.create();

  d.once('error', function (err) {
    if (!err.statusCode) {
      throw err;
    }

    res.writeHead(err.statusCode);
    res.end(JSON.stringify({
      'error': 'registry: ' + err.message
    }));
  });

  this.emit('request', target, req, res, d);
};


module.exports = Receiver;
