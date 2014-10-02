
var Url = require('url');


/**
 * @constructor
 */
var Bitbucket = function (https) {
  this.$https = https;
};


Bitbucket.prototype.head = function (url, auth, callback) {
  var url = Url.parse('/api/1.0' + url);
  url.host = 'bitbucket.org';
  url.auth = auth;

  this.$https.get(url, function (res) {
    if (res.statusCode >= 400) {
      return callback(new Error('Failed (' + res.statusCode + ')'));
    }
    callback(null);
  });
};


Bitbucket.prototype.get = function (url, auth, callback) {
  var url = Url.parse('/api/1.0' + url);
  url.host = 'bitbucket.org';
  url.auth = auth;

  this.$https.get(url, function (res) {
    if (res.statusCode >= 400) {
      return callback(new Error('Failed (' + res.statusCode + ')'), null);
    }

    var json = '';
    res.setEncoding('utf8')
    res.on('data', function (chunk) { json += chunk; });
    res.once('end', function () {
      var data = null;
      try {
        data = JSON.parse(json);
      } catch (err) {};

      callback(null, data);
    });
  });
};


Bitbucket.prototype.getRepositorySlugs = function (account, auth, callback) {
  var url = '/users/' + account;
  this.get(url, auth, function (err, data) {
    if (err) {
      return callback(err, null);
    }

    var slugs = data['repositories'].map(function (repo) {
      return repo['slug'];
    });
    callback(null, slugs);
  });
};


module.exports = Bitbucket;
