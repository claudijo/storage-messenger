// Helper to open window, since driver.openWindow() is not implemented in
// WebDriverJS 2.37.0
exports.openWindow = function(driver, url, name) {
  name = name || '';

  return driver.executeScript('window.open(arguments[0], arguments[1])', url,
      name);
};

// Helper to get localStorage size, since driver.getLocalStorageSize() is not
// implemented in WebDriverJS as of this writing.
exports.getLocalStorageSize = function(driver) {
  return driver.executeScript('return window.localStorage.length');
};

// Helper to get localStorage size, since driver.getLocalStorageItem() is not
// implemented in WebDriverJS as of this writing.
exports.getLocalStorageItem = function(driver ,key) {
  return driver.executeScript('return window.localStorage.getItem(arguments[0])',
      key);
};
