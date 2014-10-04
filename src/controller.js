
/**
 * @constructor
 */
var Controller = function (registry) {
  this.$registry = registry;
};


Controller.prototype.endWithJson = function (res, data) {
  res.end(JSON.stringify(data));
};


Controller.prototype['index'] = function (req, res) {
  this.endWithJson(res, {
    'ok': 1,
    'description': 'npm git registry'
  });
};


Controller.prototype['auth'] = function (req, res, callback) {
  var username = req.body['name'];
  var password = req.body['password'];

  var self = this;
  this.$registry.checkUser(username, password, function (err) {
    if (err) {
      return callback(err);
    }

    res.writeHead(201);
    self.endWithJson(res, req.body);
  });
};


Controller.prototype['info'] = function (req, res, callback) {
  var name = req.url.substr(1).replace(/%2[fF]/g, '/');
  var headers = req.headers;

  var self = this;
  this.$registry.getPackageInfo(name, headers, function (err, info) {
    if (err) {
      return callback(err);
    }
    if (!info) {
      err = new Error('package ' + name + ' not found in the registry');
      err.statusCode = 404;
      return callback(err);
    }

    res.writeHead(200);
    self.endWithJson(res, info);
  });
};


Controller.prototype['tarball'] = function (req, res, callback) {
  var name = req.url.substr(1).replace(/%2[fF]/g, '/');
  name = name.replace(/\/tarball$/, '');
  var headers = req.headers;

  var self = this;
  this.$registry.getPackageTarballStream(name, headers, function (err, tar) {
    if (err) {
      return callback(err);
    }
    if (!tar) {
      err = new Error('tarball for the package ' + name + ' not found');
      err.statusCode = 404;
      return callback(err);
    }
    if (typeof tar === 'string') {
      res.writeHead(301, {
        'location': tar
      });
      return res.end();
    }

    res.writeHead(200);
    tar.pipe(res);
  });
};


module.exports = Controller;
