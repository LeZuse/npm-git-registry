
var package = require('../');

var MockHttp = require('mock-http');


describe('authentication', function () {
  var http;
  var https;

  var server;

  beforeEach(function (callback) {
    http = new MockHttp();
    https = new MockHttp();

    package.main(null, http, https, function (err) {
      expect(err).to.be(null);

      server = http.createServer();
      callback(null);
    });
  });


  it('should validate npm login information against the Bitbucket API (/user)',
      function (callback) {
    var body = {
      'name': 'jankuca',
      'password': 'asdf'
    };

    https.interceptRequestInTest('GET bitbucket.org/api/1.0/user',
        function (req) {
      var auth_base64 = req.headers['authorization'].split(' ')[1];
      var auth = new Buffer(auth_base64, 'base64').toString('utf8');
      expect(auth).to.be(body['name'] + ':' + body['password']);

      return {
        status: 200,
        body: JSON.stringify({
          'username': body['name']
        })
      };
    });

    var url = '/-/user/org.couchdb.user:' + body['name'];
    server.putInTest(url, body, function (res) {
      expect(res.statusCode).to.be(201);

      var json = res.getBodyInTest();
      expect(JSON.parse(json)).to.eql(body);

      callback();
    });
  });
});
