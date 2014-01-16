[![Build Status](https://travis-ci.org/claudijo/storage-messenger.png?branch=master)](https://travis-ci.org/claudijo/storage-messenger) [![Code Climate](https://codeclimate.com/github/claudijo/storage-messenger.png)](https://codeclimate.com/github/claudijo/storage-messenger)
StorageMessenger.js
===================
StorageMessenger.js is a JavaScript micro-library that utilizes HTML5 localStorage as transport mechanism for passing messages between browser windows with content loaded from the same domain.

The library runs in browsers that support localStorage, including Internet Explorer 8+, Firefox, Chrome, Safari, Chrome, and Opera.

Background
----------
Several browser windows with content loaded from the same domain share localStorage as a common resource. A storage event is fired when content in localStorage is changed, which then can be used to build an event driven transport mechanism for message passing. This is particularly useful when the browser windows don't have direct references to each other, for instance through `window.open()` or `window.opener`.

StorageMessenger.js can be used to share state between different browser windows without the need for a central server. An interesting, but by no means fair, comparison can be made with [Meteor.js](http://www.meteor.com), which instead uses a server to sync state among different browser windows.

Usage
-----
StorageMessenger.js exposes a global `StorageMessenger` namespace object once loaded.

```js
// Create a Storage Messenger event hub.
var eventHub = StorageMessenger.create();

// Trigger event in one browser window, optionally passing params.
eventHub.trigger(event, [params]);

// Listen for specified event coming from another browser window.
eventHub.on(event, callback);

// Ignore specified event coming from another browser window.
eventHub.off(event, callback);

// Avoid polluting the global scope.
var LocalCopyOfStorageMessenger = StorageMessenger.noConflict();
```

Development Setup
-----------------
Download and install dependencies (requires [Node.js](http://nodejs.org/) and npm).

`npm install`

Integration tests require [Java Runtime Environment (JRE)](http://java.com/download) to run.

Unit Tests
----------
Point your target browser to `storage-messenger/test/unit/spec-runner.html`.

Integration Tests
-----------------
Integration tests are built on the JavaScript bindings for Selenium WebDriver. The supporting code for the integration tests borrows from the WebDriverJS self tests, and are run in a similar way.

The integration tests can be run without the standalone Selenium Server by downloading the [ChromeDriver](https://code.google.com/p/chromedriver/), which is natively supported by Selenium WebDriver. Make sure the executable is available on `PATH` and run the test as follows:

`node_modules/mocha/bin/mocha -R list --recursive test/integration/spec`

Other drivers (e.g. Firefox, Internet Explorer, and Safari), require the standalone Selenium server. To run the tests against multiple browsers, download the [Selenium server](https://code.google.com/p/selenium/downloads/list) and specify its location through the `SELENIUM_SERVER_JAR` environment variable. Use the `SELENIUM_BROWSER` environment variable to define a comma-separated list of browsers to test against. For example:

```
export SELENIUM_SERVER_JAR=~/java/selenium-server-standalone-2.37.0.jar \
SELENIUM_BROWSER=firefox,chrome,safari &&  node_modules/mocha/bin/mocha -R \
list --recursive test/integration/spec
```

Note that the browser's popup blocker might need to be disabled manually to make the tests pass.

Technical Notes and Disclaimer
------------------------------
StorageMessenger.js is 100% event driven, and does not rely on polling localStorage. The implementation is in general suboptimal in order to support IE8 without having to split up the logic in different code paths. Efforts have been made to avoid the risk of race conditions considering that the web storage mutex is not guaranteed to be implemented in all browsers.

On frequent event passing with many browser windows opened, a substantial amount of data will be flushed through localStorage. A high number of already present items in localStorage will have negative impact on performance.


