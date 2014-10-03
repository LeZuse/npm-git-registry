var path = require('path');

var ApplicationFactory = require('./src/application-factory');
var Configurator = require('./src/configurator');


var main = function (fs, http, https, callback) {
  fs = fs || require('fs');
  http = http || require('http');
  https = https || require('https');

  var configurator = new Configurator(fs);
  configurator.addDirectory(path.dirname(require.main.filename));
  configurator.addDirectory(__dirname);

  var app_factory = new ApplicationFactory(configurator, fs, http, https);
  var app = app_factory.createApplication();

  app.setPort(process.env['PORT'] || 8080);
  app.run(callback);
};


if (require.main === module) {
  main(null, null, null);
} else {
  exports.main = main;
}
