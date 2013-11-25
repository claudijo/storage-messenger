var By = require('selenium-webdriver').By;

exports.sendMessage = function(driver, message) {
  driver.findElement(By.id('message')).sendKeys(message);
  driver.findElement(By.id('message-form')).submit();
};

exports.getReceivedMessage = function(driver) {
  return driver.findElement(By.id('received-message')).getAttribute('value');
};

exports.getTransportMessageListenerKey = function(driver) {
  return driver.executeScript(
      'return window.transport._MESSAGE_LISTENER_KEY');
}
