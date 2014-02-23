module.exports = {
  server: {
    address: function() {
      return 'http://ondemand.saucelabs.com:80/wd/hub'
    }
  },

  browsersToTest: [
    {
      browserName: 'Chrome',
      platform: 'Windows 2012'
    }
  ]
};
