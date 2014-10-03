var fs = require('fs');
var os = require('os');
var path = require('path');
var package = require('../');

var MockFs = require('@ripple/mock-fs');
var MockHttp = require('@ripple/mock-http');


describe('package retrieval', function () {
  var mock_fs;
  var http;
  var https;

  var app_dirname;
  var server;

  beforeEach(function (callback) {
    mock_fs = MockFs.create();
    http = new MockHttp();
    https = new MockHttp();

    app_dirname = path.resolve(__dirname, '..');
    mock_fs.addFileInTest(
      path.join(app_dirname, 'config', 'routes.json'),
      fs.readFileSync(path.resolve(app_dirname, 'config', 'routes.json'))
    );
    mock_fs.addFileInTest(
      path.join(app_dirname, 'config', 'scope-mappings.json'),
      JSON.stringify({
        '@ripple': { 'account': 'jollor' }
      })
    );

    package.main(mock_fs, http, https, function (err) {
      expect(err).to.be(null);

      server = http.createServer();
      callback(null);
    });
  });


  it('should find a scoped package within Bitbucket repositories',
      function (callback) {
    var expected_auth = 'jankuca:asdf';
    var checkAuth = function (req) {
      var auth_base64 = req.headers['authorization'].split(' ')[1];
      var auth = new Buffer(auth_base64, 'base64').toString('utf8');
      expect(auth).to.be(auth);
    }

    var index_url = 'GET bitbucket.org/api/1.0/users/jollor';
    var info_url = 'GET bitbucket.org/api/1.0/repositories/jollor' +
          '/abc/raw/master/package.json';
    var tarball_url = 'GET bitbucket.org/jollor/abc/get/master.tar.gz';

    https.interceptRequestInTest(index_url, checkAuth);
    https.interceptRequestInTest(info_url, checkAuth);
    https.interceptRequestInTest(tarball_url, checkAuth);

    https.setResponseInTest(index_url, {
      status: 200,
      body: JSON.stringify({
        'repositories': [
          { 'slug': 'abc' }
        ]
      })
    });
    https.setResponseInTest(info_url, {
      status: 200,
      body: JSON.stringify({
        'name': '@ripple/abc'
      })
    });
    https.setResponseInTest(tarball_url, {
      status: 200,
      body: ''
    });

    var url = '/@ripple%2fabc';
    var req = server.getInTest(url, function (res) {
      console.log(res.getBodyInTest().toString());
      expect(res.statusCode).to.be(200);

      var json = res.getBodyInTest();
      var info = JSON.parse(json);
      expect(info['name']).to.be('@ripple/abc');

      callback();
    });

    var auth_base64 = new Buffer(expected_auth).toString('base64');
    req.headers['authorization'] = 'Basic ' + auth_base64;
  });
});
