'use strict';

var assert = require('selenium-webdriver/testing/assert'),
    test = require('../selenium-webdriver-extract/lib/test'),
    seleniumUtils = require('../selenium-webdriver-utils'),
    shoutbox = require('../spec-helper'),
    Pages = test.Pages;

test.suite(function(env) {
  var driver;

  var assertHasOwnStorageMessageListenerKeyInStorage = function() {
    shoutbox.getTransportMessageListenerKey(driver).then(function(key) {
      assert(seleniumUtils.getLocalStorageItem(driver, key)).not.equalTo(null);
    });
  };

  beforeEach(function() {
    driver = env.driver;
    driver.get(Pages.shoutbox);
  });

  describe('Single browser window', function() {
    test.it('should have correct items in storage', function() {
      assertHasOwnStorageMessageListenerKeyInStorage();
      assert(seleniumUtils.getLocalStorageSize(driver)).equalTo(1);
    });

    test.it('should have correct number of items in storage after sending ' +
        'message without any other windows open', function() {
      shoutbox.sendMessage(driver, 'hey');
      assertHasOwnStorageMessageListenerKeyInStorage();
      assert(seleniumUtils.getLocalStorageSize(driver)).equalTo(1);
    });

    test.it('should have correct items in storage after refreshing window',
        function() {
      driver.navigate().refresh();
      assertHasOwnStorageMessageListenerKeyInStorage();
      assert(seleniumUtils.getLocalStorageSize(driver)).equalTo(1);
    });

    test.it('should have correct items in storage after browsing to ' +
        'any page and going back', function() {
      driver.get(Pages.empty);
      driver.get(Pages.shoutbox);
      assertHasOwnStorageMessageListenerKeyInStorage();
      assert(seleniumUtils.getLocalStorageSize(driver)).equalTo(1);
    });

    test.it('should have correct items in storage after closing browser, ' +
        'then opening it again', function() {
      env.refreshDriver();
      driver = env.driver;
      driver.get(Pages.shoutbox);
      assertHasOwnStorageMessageListenerKeyInStorage();
      assert(seleniumUtils.getLocalStorageSize(driver)).equalTo(1);
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
      assertHasOwnStorageMessageListenerKeyInStorage();
      driver.switchTo().window('receiver');
      assertHasOwnStorageMessageListenerKeyInStorage();
      assert(seleniumUtils.getLocalStorageSize(driver)).equalTo(2);
    });

    test.it('should have correct items in local storage after sending ' +
        'message with second window open', function() {
      shoutbox.sendMessage(driver, 'hey');
      assertHasOwnStorageMessageListenerKeyInStorage();
      driver.switchTo().window('receiver');
      assertHasOwnStorageMessageListenerKeyInStorage();
      assert(seleniumUtils.getLocalStorageSize(driver)).equalTo(2);
    });

    test.it('should have correct number of items in local storage after ' +
        'closing second window', function() {
      driver.switchTo().window('receiver');
      driver.close();
      driver.switchTo().window(mainWindowHandle);
      assertHasOwnStorageMessageListenerKeyInStorage();
      assert(seleniumUtils.getLocalStorageSize(driver)).equalTo(1);
    });

    test.it('should be able to receive message sent from main window to ' +
        'second window', function() {
      shoutbox.sendMessage(driver, 'foo');
      driver.switchTo().window('receiver');
      assert(shoutbox.getReceivedMessage(driver)).equalTo('foo');
    });

    test.it('should be able to receive consecutive messages sent from main ' +
        'window to second window', function() {
      shoutbox.sendMessage(driver, 'foo');
      shoutbox.sendMessage(driver, 'bar');
      driver.switchTo().window('receiver');
      assert(shoutbox.getReceivedMessage(driver)).equalTo('bar');
    });
  });
});
