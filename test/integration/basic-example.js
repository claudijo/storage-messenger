/* jshint -W061 */
var webdriver = require('wd');
var assert = require('assert');

var browser = webdriver.remote({
  hostname: 'localhost',
  port: 4445,
  user: process.env.SAUCE_USERNAME,
  pwd: process.env.SAUCE_ACCESS_KEY,
  path: '/wd/hub'
});

browser.on('status', function(info){
  console.log('\x1b[36m%s\x1b[0m', info);
});

browser.on('command', function(meth, path){
  console.log(' > \x1b[33m%s\x1b[0m: %s', meth, path);
});

var desired = {
  browserName: 'firefox',
  version: '26',
  platform: 'Mac 10.6',
  tags: ["examples"],
  name: "This is an example test",
  'tunnel-identifier': process.env.TRAVIS_JOB_NUMBER
};

browser.init(desired, function() {
  browser.get("http://localhost:9001/test/integration/data/shoutbox.html", function() {
    browser.title(function(err, title) {
      assert.ok(~title.indexOf('Storage Messenger Shoutbox'), 'Wrong title!');
      browser.quit();
    });
  });
});
