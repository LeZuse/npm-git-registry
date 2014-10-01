var shasum = require('shasum');
var os = require('os');
var path = require('path');
var util = require('util');

var Fuzzyset = require('fuzzyset.js');
var PackageName = require('./package-name');


/**
 * @constructor
 */
var Registry = function (bitbucket, https, fs) {
  this.$bitbucket = bitbucket;
  this.$https = https;
  this.$fs = fs;

  this.scope_mappings_ = {};
  this.cache_ = {};
};


Registry.prototype.mapScopes = function (descs) {
  Object.keys(descs).forEach(function (scope) {
    this.mapScope(scope, descs[scope]);
  }, this);
};


Registry.prototype.mapScope = function (scope, desc) {
  desc.scope = scope;
  this.scope_mappings_[scope] = desc;
};


Registry.prototype.checkUser = function (username, password, callback) {
  var auth = username + ':' + password;

  var self = this;
  this.$bitbucket.head('/user', auth, function (err) {
    if (err) {
      return callback(new RegistryError(403, 'wrong credentials'));
    }
    callback(null);
  });
};


Registry.prototype.getPackageInfo = function (name, headers, callback) {
  headers = headers || {};

  if (!headers['authorization']) {
    return callback(new RegistryError(
        401, 'no credentials, use `npm login --always-auth`'));
  }

  var pkg = PackageName.parse(name);
  var mapping = this.scope_mappings_[pkg.root_scope];
  if (!mapping) {
    return callback(new RegistryError(400,
        'the registry does not handle the scope "' + pkg.root_scope + '"'));
  }

  var request = new PackageInfoRequest(this, this.$bitbucket);
  request.setPackageName(pkg);
  request.setRepositoryMapping(mapping);

  var auth_base64 = headers['authorization'].split(' ')[1];
  var auth = new Buffer(auth_base64, 'base64').toString('utf8');
  request.setAuth(auth);

  var session_key = headers['npm-session'];
  request.setSessionKey(session_key);

  request.send(callback);
};


Registry.prototype.getPackageTarballStream = function (
    name, headers, callback) {
  if (!headers['authorization']) {
    return callback(new RegistryError(
        401, 'no credentials, use `npm login --always-auth`'));
  }

  var session_key = headers['npm-session'];
  var pkg = PackageName.parse(name);

  var filename = this.getCacheKey(session_key, pkg.stringify());
  if (!filename) {
    var self = this;
    this.getPackageInfo(name, headers, function (err, info) {
      if (err) {
        return callback(err, null);
      }

      var version_info = info['versions'][pkg.revision];
      if (!version_info) {
        return callback(null, null);
      }

      var auth_base64 = headers['authorization'].split(' ')[1];
      var auth = new Buffer(auth_base64, 'base64').toString('utf8');
      var url = version_info['dist']['tarball'];
      return this.getStream_(url, auth, callback);
    });
  }

  var stream;
  try {
    stream = this.$fs.createReadStream(filename);
  } catch (err) {
    return callback(null, null);
  }
  callback(null, stream);
};


Registry.prototype.downloadAsUser = function (url, auth, callback) {
  var filename = path.join(os.tmpdir(), shasum(url));

  var self = this;
  this.getStream_(url, auth, function (err, res) {
    if (err) {
      return callback(err, null);
    }

    var data = new Buffer(0);
    res.on('data', function (chunk) {
      data = Buffer.concat([ data, chunk ]);
    });

    res.once('end', function () {
      self.$fs.writeFile(filename, data, function (err) {
        if (err) {
          return callback(err, null);
        }

        var checksum = shasum(data);
        callback(null, filename, checksum);
      });
    });
  });
};


Registry.prototype.getStream_ = function (url, auth, callback) {
  var req = this.$https.get(url, function (res) {
    if (res.statusCode >= 400) {
      return callback(new RegistryError(res.statusCode, 'Failed to stream'));
    }
    callback(null, res);
  });

  req.once('error', function (err) {
    callback(err, null);
  });
};


Registry.prototype.setCacheKey = function (session_key, cache_key, value) {
  this.cache_[session_key] = this.cache_[session_key] || {};
  this.cache_[session_key][cache_key] = value;
};


Registry.prototype.getCacheKey = function (session_key, cache_key) {
  if (!this.cache_[session_key]) {
    return null;
  }

  var value = this.cache_[session_key][cache_key];
  return (typeof value !== 'undefined') ? value : null;
};



/**
 * @constructor
 */
var PackageInfoRequest = function (registry, bitbucket) {
  this.$registry = registry;
  this.$bitbucket = bitbucket;

  this.pkg_ = null;
  this.auth_ = null;
  this.session_key_ = null;
};


PackageInfoRequest.prototype.setPackageName = function (pkg) {
  this.pkg_ = pkg;
};


PackageInfoRequest.prototype.setRepositoryMapping = function (mapping) {
  this.mapping_ = mapping;
};


PackageInfoRequest.prototype.setAuth = function (auth) {
  this.auth_ = auth;
};


PackageInfoRequest.prototype.setSessionKey = function (session_key) {
  this.session_key_ = session_key;
};


PackageInfoRequest.prototype.send = function (callback) {
  var self = this;
  this.$bitbucket.getRepositorySlugs(self.mapping_.account, self.auth_,
      function (err, slugs) {
    if (err) {
      return callback(err, null);
    }

    self.findPackageAsUser_(slugs, callback);
  });
};


PackageInfoRequest.prototype.findPackageAsUser_ = function (slugs, callback) {
  var mapping = this.mapping_;
  if (mapping.filter) {
    slugs = slugs.filter(function (slug) {
      return mapping.filter.test(slug);
    });
  }

  var most_likely_slug_match = this.findMostLikelySlug_(slugs);
  if (!most_likely_slug_match) {
    return this.findInfoInSlugs_(slugs, callback);
  }

  var self = this;
  var most_likely_slug = most_likely_slug_match[0][1];
  this.getInfoForSlug_(most_likely_slug, function (err, info) {
    if (err || !info) {
      return self.findInfoInSlugs_(slugs, callback);
    }

    callback(null, info, most_likely_slug);
  });
};


PackageInfoRequest.prototype.findMostLikelySlug_ = function (slugs) {
  var set = new Fuzzyset(slugs);
  return set.get(this.pkg_.relative_name);
};


PackageInfoRequest.prototype.findInfoInSlugs_ = function (slugs, callback) {
  var i = 0;
  var self = this;

  var next = function () {
    var slug = slugs[i++];
    if (!slug) {
      return callback(new RegistryError(
          404, 'package ' + self.pkg_.name + ' not found in the registry'));
    }

    self.getInfoForSlug_(slug, function (err, info) {
      if (info) {
        return callback(null, info);
      }
      next();
    });
  };

  next();
};


PackageInfoRequest.prototype.getInfoForSlug_ = function (slug, callback) {
  var pkg = this.pkg_;

  var url = '/repositories/' + this.mapping_.account + '/' + slug + '/raw';
  url += '/' + (pkg.revision === 'latest' ? 'master' : pkg.revision);
  url += '/package.json';

  var self = this;
  this.$bitbucket.get(url, this.auth_, function (err, info) {
    if (err) {
      return callback(err, null);
    }
    if (info['name'] !== self.pkg_.root_relative_name) {
      return callback(null, null);
    }

    self.normalizeInfo_(info, slug, callback);
  });
};


PackageInfoRequest.prototype.normalizeInfo_ = function (
    info, slug, callback) {
  var pkg = this.pkg_;
  var revision = (pkg.revision === 'latest' ? 'master' : pkg.revision);

  var normalized = {};
  Object.keys(info).forEach(function (key) {
    normalized[key] = info[key];
  });

  normalized['dist-tags'] = {};
  normalized['dist-tags']['latest'] = info['version'];

  normalized['versions'] = {};
  normalized['versions'][info['version']] = info;

  var tarball_url = 'https://' + this.auth_ + '@bitbucket.org';
  tarball_url += '/' + this.mapping_.account + '/' + slug;
  tarball_url += '/get/' + revision + '.tar.gz';

  var self = this;
  this.$registry.downloadAsUser(tarball_url, this.auth_,
      function (err, filename, checksum) {
    if (err) {
      return callback(err, null);
    }

    if (self.session_key_) {
      self.$registry.setCacheKey(self.session_key_, pkg.stringify(), filename);
    }

    var name_safe = pkg.stringify().replace(/\//g, '%2f');
    info['dist'] = {};
    info['dist']['tarball'] = 'http://localhost:8080/' + name_safe + '/tarball';
    info['dist']['shasum'] = checksum;

    callback(null, normalized);
  });
};




/**
 * @constructor
 * @extends {Error}
 */
var RegistryError = function (code, message) {
  Error.call(this, message);
  this.statusCode = 400;
};

util.inherits(RegistryError, Error);

RegistryError.prototype.statusCode = 500;



module.exports = Registry;
