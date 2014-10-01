
var ApplicationFactory = require('./src/application-factory');


var main = function (fs, http, https, callback) {
  fs = fs || require('fs');
  http = http || require('http');
  https = https || require('https');

  var app_factory = new ApplicationFactory(fs, http, https);
  var app = app_factory.createApplication(__dirname);

  app.setPort(process.env['PORT'] || 8080);
  app.run(callback);
};


if (require.main === module) {
  main(null, null, null);
} else {
  exports.main = main;
}
