StorageMessenger.js
===================
StorageMessenger.js is a micro library for JavaScript that utilizes HTML5 localStorage as transport mechanism for passing messages between browser windows with content loaded from the same domain.

The library runs in browsers that support Web Storage, including +IE8, Firefox, Chrome, Safari, Chrome, and Opera.

Background
----------
Several browser windows with content loaded from the same domain share localStorage as a common resource. A storage event is fired when content in localStorage is changes, which then can be used to build an event driven transport mechanism for message passing. This is particularly useful when the browser windows don't have direct references to each other, for instance through `window.open()` or `window.opener`.

StorageMessenger.js can be used to share state between different browser windows without the need of a central server. An interesting, but by no means fair, comparison can be made with [Meteor.js](http://www.meteor.com), which instead uses a server to sync state among different browser windows.

Usage
-----
StorageMessenger.js exposes a global `StorageMessenger` namespace object once loaded.

```js
// Create a transport instance
var transport = new StorageMessenger.Transport();

// Trigger event in one browser window
transport.trigger(event, [*args]);

// Listen for events in another browser window
transport.listen(event, callback, [context]);

// Avoid polluting the global scope;
var LocalCopyOfStorageMessenger = StorageMessenger.noConflict();
```

Development Setup
-----------------
Download and install dependencies (requires [Node.js](http://nodejs.org/) and npm).

`npm install`

Integration tests require [Java Runtime Environment (JRE)](http://java.com/download) to run.

Unit Tests
----------
Point your target browser to storage-messenger/test/unit/spec-runner.html.

Integration Tests
-----------------
Integration tests are built on the JavaScript bindings for Selenium WebDriver. The supporting code for the integration tests borrows from the WebDriverJS self tests, and are run in a similar way.

The integration tests can be run without the standalone Selenium Server by downloading the [ChromeDriver](https://code.google.com/p/chromedriver/), which is natively supported by Selenium WebDriver. Make sure the executable is available on `PATH` and run the test as follows:

`npm test`

Other drivers (e.g. Firefox, Internet Explorer, and Safari), require the standalone Selenium server. To run the tests against multiple browsers, download the [Selenium server](https://code.google.com/p/selenium/downloads/list) and specify its location through the SELENIUM_SERVER_JAR environment variable. Use the SELENIUM_BROWSER environment variable to define a comma-separated list of browsers to test against. For example:

```
export SELENIUM_SERVER_JAR=~/java/selenium-server-standalone-2.37.0.jar \
SELENIUM_BROWSER=firefox,chrome,safari &&  npm test
```

Note that the browser's popup blocker might need to be disabled manually to make the tests pass.

Technical Notes and Disclaimer
------------------------------
StorageMessenger.js is 100% event driven, and does not rely on polling localStorage. The implementation is in general suboptimal in order to support IE8 without having to split up the logic in different code paths. Efforts have been made to avoid the risk of race conditions considering that the web storage mutex is not implemented in all browsers.

On frequent event passing with many browser windows opened a substantial amount of data will be flushed through localStorage. A high number of already present items in localStorage will have negative impact on performance.


