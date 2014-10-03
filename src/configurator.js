var path = require('path');


/**
 * @constructor
 */
var Configurator = function (fs) {
  this.$fs = fs;

  this.dirnames_ = [];
};


Configurator.prototype.addDirectory = function (dirname) {
  this.dirnames_.push(dirname);
};


Configurator.prototype.read = function (/* var_levels */) {
  var filename = this.find.apply(this, arguments);
  if (!filename) {
    return null
  }

  var data = this.$fs.readFileSync(filename, 'utf8');
  return data;
};


Configurator.prototype.find = function (/* var_levels */) {
  var rel_filename = path.join.apply(path, arguments);

  var dirnames = this.dirnames_;
  for (var i = 0, ii = dirnames.length; i < ii; ++i) {
    var filename = path.join(dirnames[i], rel_filename);
    if (this.$fs.existsSync(filename)) {
      return filename;
    }
  }

  return null;
};


module.exports = Configurator;
