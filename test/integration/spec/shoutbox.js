var assert = require('assert');
var test = require('../lib/testing');
var Pages = require('../lib/testing').Pages;
var seleniumUtils = require('../selenium-webdriver-utils');
var shoutbox = require('../spec-helper');

test.suite(function(env) {
  var driver;

  beforeEach(function() {
    driver = env.driver;
    driver.get(Pages.shoutbox);
  });

  describe('Single browser window', function() {
    test.it('should have correct items in storage', function() {
      seleniumUtils.getLocalStorageSize(driver).then(function(size) {
        assert.equal(size, 1);
      });
    });

    test.it('should have correct number of items in storage after sending ' +
        'message without any other windows open', function() {
      shoutbox.sendMessage(driver, 'hey');
      seleniumUtils.getLocalStorageSize(driver).then(function(size) {
        assert.equal(size, 1);
      });
    });

    test.it('should have correct items in storage after refreshing window',
        function() {
      driver.navigate().refresh();
      seleniumUtils.getLocalStorageSize(driver).then(function(size) {
        assert.equal(size, 1);
      });
    });

    test.it('should have correct items in storage after browsing to ' +
        'any page and going back', function() {
      driver.get(Pages.empty);
      driver.get(Pages.shoutbox);
      seleniumUtils.getLocalStorageSize(driver).then(function(size) {
        assert.equal(size, 1);
      });
    });

    test.it('should have correct items in storage after closing browser, ' +
        'then opening it again', function() {
      driver = env.refreshDriver();
      driver.get(Pages.shoutbox);
      seleniumUtils.getLocalStorageSize(driver).then(function(size) {
        assert.equal(size, 1);
      });
    });
  });

  describe('Two browser windows', function() {
    var mainWindowHandle;

    var closeAllSecondaryWindows = function() {
      driver.getAllWindowHandles().then(function(windowHandles) {
        windowHandles.forEach(function(windowHandle) {
          if(windowHandle !== mainWindowHandle) {
            driver.switchTo().window(windowHandle);
            driver.close();
          }
        });
      });
      driver.switchTo().window(mainWindowHandle);
    };

    beforeEach(function() {
      driver.getWindowHandle().then(function(windowHandle) {
        mainWindowHandle = windowHandle;
      });

      seleniumUtils.openWindow(driver, driver.getCurrentUrl(), 'receiver');
    });

    afterEach(function() {
      closeAllSecondaryWindows();
    });

    test.it('should have correct items in local storage after opening ' +
        'second window', function() {
      driver.switchTo().window('receiver');
      seleniumUtils.getLocalStorageSize(driver).then(function(size) {
        assert.equal(size, 2);
      });
    });

    test.it('should have correct items in local storage after sending ' +
        'message with second window open', function() {
      shoutbox.sendMessage(driver, 'hey');
      driver.switchTo().window('receiver');
      seleniumUtils.getLocalStorageSize(driver).then(function(size) {
        assert.equal(size, 2);
      });
    });

    test.it('should have correct number of items in local storage after ' +
        'closing second window', function() {
      driver.switchTo().window('receiver');
      driver.close();
      driver.switchTo().window(mainWindowHandle);
      seleniumUtils.getLocalStorageSize(driver).then(function(size) {
        assert.equal(size, 1);
      });
    });

    test.it('should be able to receive message sent from main window to ' +
        'second window', function() {
      shoutbox.sendMessage(driver, 'foo');
      driver.switchTo().window('receiver');
      shoutbox.getReceivedMessage(driver).then(function(receivedMessage) {
        assert.equal(receivedMessage, 'foo');
      });
    });

    test.it('should be able to receive consecutive messages sent from main ' +
        'window to second window', function() {
      shoutbox.sendMessage(driver, 'foo');
      shoutbox.sendMessage(driver, 'bar');
      driver.switchTo().window('receiver');
      shoutbox.getReceivedMessage(driver).then(function(receivedMessage) {
        assert.equal(receivedMessage, 'bar');
      });
    });
  });
});

