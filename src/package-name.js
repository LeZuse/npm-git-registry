

var PackageName = function () {
  this.name = null;
  this.scope = null;
  this.root_scope = null;
  this.relative_name = null;
  this.root_relative_name = null;
  this.revision = 'latest';
};


PackageName.prototype.stringify = function () {
  var name = this.name;

  if (this.relative_name) {
    name = this.relative_name;
    if (this.scope) {
      name = this.scope + '/' + name;
    }
  } else if (this.root_relative_name) {
    name = this.root_relative_name;
    if (this.root_scope) {
      name = this.root_scope + '/' + name;
    }
  }

  if (this.revision && this.revision !== 'latest') {
    name += '@' + this.revision;
  }

  return name;
};


PackageName.parse = function (name) {
  var pkg = new PackageName();

  var parts = name.split('@');
  if (parts.length === 1) {
    pkg.name = name;
  } else {
    if (parts[0] === '') {
      pkg.name = '@' + parts[1];
      pkg.scope = pkg.name.replace(/\/[^\/]+?$/, '');
      pkg.root_scope = pkg.scope.split('/')[0];
      pkg.relative_name = pkg.name.substr(pkg.scope.length + 1);
      pkg.root_relative_name = pkg.name.substr(pkg.root_scope.length + 1);
    } else {
      pkg.name = parts[0];
    }

    if (parts[0] !== '' || parts.length === 3) {
      pkg.revision = parts[parts.length - 1];
    }
  }

  return pkg;
};


module.exports = PackageName;
