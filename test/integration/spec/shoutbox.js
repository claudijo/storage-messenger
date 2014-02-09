var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
var wd = require('wd');

require("mocha-as-promised")();
require('colors');

chai.use(chaiAsPromised);
chai.should();

// enables chai assertion chaining
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

describe('mocha spec examples', function() {
  this.timeout(10000);

  // using mocha-as-promised and chai-as-promised is the best way
  describe("using mocha-as-promised and chai-as-promised", function() {
    var browser;
    var allPassed = true;

    before(function() {
      browser = wd.promiseChainRemote({
        hostname: '127.0.0.1',
        port: 4445,
        user: process.env.SAUCE_USERNAME,
        pwd: process.env.SAUCE_ACCESS_KEY,
        path: '/wd/hub'
      });

      browser.on('status', function(info) {
        console.log(info);
      });

      browser.on('command', function(meth, path, data) {
        console.log(' > ' + meth, path, data || '');
      });

      return browser.init({
        browserName:'chrome',
        tags: ["examples"],
        'tunnel-identifier': process.env.TRAVIS_JOB_NUMBER,
        build: process.env.TRAVIS_JOB_ID
      });
    });

    beforeEach(function() {
      return browser.get('http://localhost:9001/test/integration/data/shoutbox.html');
    });

    afterEach(function() {
      allPassed = allPassed && (this.currentTest.state === 'passed');
    });

    after(function() {
      return browser
          .quit().then(function() {
            return(browser.sauceJobStatus(allPassed));
          });
    });

    it("should retrieve the page title", function() {
      return browser.title().should.become("Storage Messenger Shoutbox");
    });
  });

});
