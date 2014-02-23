var connect = require('connect');
var http = require('http');

var PORT = 9001;
var BASE_URL = 'http://127.0.0.1:' + PORT;

var Pages = {
  shoutbox: BASE_URL + '/test/integration/data/shoutbox.html',
  empty: BASE_URL + '/test/integration/data/empty.html'
};

var rootPath = __dirname + '../../../../';

var app = connect()
    .use(connect.favicon())
    .use(connect.static(rootPath))
    .use(connect.directory(rootPath));

var httpServer;

var start = function() {
  httpServer = http.createServer(app).listen(PORT);
};

var stop = function() {
  httpServer.close();
};

exports.Pages = Pages;
exports.start = start;
exports.stop = stop;
