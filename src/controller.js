
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


Controller.prototype['auth'] = function (req, res, d) {
  var username = req.body['name'];
  var password = req.body['password'];

  var self = this;
  this.$registry.checkUser(username, password, d.intercept(function () {
    res.writeHead(201);
    self.endWithJson(res, req.body);
  }));
};


Controller.prototype['info'] = function (req, res, d) {
  var name = req.url.substr(1).replace(/%2[fF]/g, '/');
  var headers = req.headers;

  var self = this;
  this.$registry.getPackageInfo(name, headers, d.intercept(function (info) {
    if (!info) {
      var err = new Error('package ' + name + ' not found in the registry');
      err.statusCode = 404;
      throw err;
    }

    res.writeHead(200);
    self.endWithJson(res, info);
  }));
};


Controller.prototype['tarball'] = function (req, res, d) {
  var name = req.url.substr(1).replace(/%2[fF]/g, '/');
  name = name.replace(/\/tarball$/, '');
  var headers = req.headers;

  this.$registry.getPackageTarballStream(name, headers, d.intercept(
      function (tar) {
    if (!tar) {
      var err = new Error('tarball for the package ' + name + ' not found');
      err.statusCode = 404;
      throw err;
    }

    res.writeHead(200);
    tar.pipe(res);
  }));
};


module.exports = Controller;
