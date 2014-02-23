var sauceConf = require('../config/sauce.config');

Browser = {
  ANDROID: 'android',
  CHROME: 'chrome',
  IE: 'internet explorer',
  // Shorthand for IPAD && IPHONE when using the browsers predciate.
  IOS: 'iOS',
  IPAD: 'iPad',
  IPHONE: 'iPhone',
  FIREFOX: 'firefox',
  OPERA: 'opera',
  PHANTOMJS: 'phantomjs',
  SAFARI: 'safari'
}

var browsersToTest = (function() {
  var browsers = [];
  var browserNames = process.env.SELENIUM_BROWSER || Browser.PHANTOMJS;
  browserNames = browserNames.split(',');

  if (process.env.TRAVIS) {
    return sauceConf.browsersToTest;
  }

  browserNames.forEach(function(browserName) {
    if (browserName === Browser.IOS) {
      throw Error('Invalid browser name: ' + browserName);
    }

    for (var validName in Browser) {
      if (Browser.hasOwnProperty(validName) && Browser[validName] === browserName) {
        browsers.push({browserName: browserName});
        return;
      }
    }

    throw Error('Unrecognized browser: ' + browserName);
  });

  return browsers;
})();

exports.browsersToTest = browsersToTest;
