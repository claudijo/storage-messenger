// Module heavily inspired by selenium-driver/lib/test/index.js
var assert = require('assert');
var testing = require('selenium-webdriver/testing');
var webdriver = require('selenium-webdriver');
var httpServer = require('./http-server');
var SeleniumServer = require('selenium-webdriver/remote').SeleniumServer;
var seleniumConf = require('selenium-standalone/conf');
var sauceConf = require('../config/sauce.config');
var browsersToTest = require('./browser').browsersToTest;

var TestEnvironment = function(browser, server) {
  var name = browser.browserName;
  var driver;

  this.__defineGetter__('driver', function() { return driver; });
  this.__defineGetter__('browser', function() { return name; });

  this.builder = function() {
    assert.ok(!driver, 'Can only have one driver at a time');

    var builder = new webdriver.Builder();
    var realBuild = builder.build;

    builder.build = function() {
      builder.getCapabilities()
          .set(webdriver.Capability.BROWSER_NAME, name)

          // Following properties can be undefined, for instance if running
          // tests locally.
          .set(webdriver.Capability.VERSION, browser.version)
          .set(webdriver.Capability.PLATFORM, browser.platform)
          .set('name', '[' + browser +'] StorageMessenger.js Shoutbox')
          .set('username', process.env.SAUCE_USERNAME)
          .set('accessKey', process.env.SAUCE_ACCESS_KEY)
          .set('tunnel-identifier', process.env.TRAVIS_JOB_NUMBER)

      builder.usingServer(server.address());

      driver = realBuild.call(builder);

      return driver;
    };

    return builder;
  };

  this.createDriver = function() {
    if (!driver) {
      driver = this.builder().build();
    }
    return driver;
  };

  this.refreshDriver = function() {
    this.dispose();
    return this.createDriver();
  };

  this.dispose = function() {
    if (driver) {
      driver.quit();
      driver = null;
    }
  };
};

var SELENIUM_SERVER_JAR_PATH = seleniumConf.selenium.path;
var SELENIUM_SERVER_ARGS = '-Dwebdriver.chrome.driver=' +
    seleniumConf.chromeDr.path;

var seleniumServer;

var inSuite = false;

var suite = function(fn) {
  assert.ok(!inSuite, 'You may not nest suite calls');
  inSuite = true;

  try {
    browsersToTest.forEach(function(browser) {
      testing.describe('[' + browser.browserName + ']', function() {
        var env;
        var serverToUse = null;

        if (process.env.TRAVIS) {
          serverToUse = sauceConf.server;
        } else {
          serverToUse = seleniumServer;
          if (!serverToUse) {
            serverToUse = seleniumServer =
                new SeleniumServer(SELENIUM_SERVER_JAR_PATH, {
              port: 4444,
              args: SELENIUM_SERVER_ARGS
            });
          }

          testing.before(seleniumServer.start.bind(seleniumServer, 60 * 1000));
        }

        env = new TestEnvironment(browser, serverToUse);

        testing.beforeEach(function() {
          env.createDriver();
        });

        testing.after(function() {
          env.dispose();
        });

        fn(env);
      });
    });
  } finally {
    inSuite = false;
  }
};

// GLOBAL TEST SETUP
testing.before(httpServer.start);
testing.after(httpServer.stop);

testing.after(function() {
  if (seleniumServer) {
    seleniumServer.stop();
  }
});

// PUBLIC API
exports.suite = suite;
exports.after = testing.after;
exports.afterEach = testing.afterEach;
exports.before = testing.before;
exports.beforeEach = testing.beforeEach;
exports.it = testing.it;
exports.ignore = testing.ignore;

exports.Pages = httpServer.Pages;
