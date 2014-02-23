module.exports = {
  server: {
    address: function() {
      return 'http://ondemand.saucelabs.com:80/wd/hub';
    }
  },

  browsersToTest: [
    {
      browserName: 'firefox',
      platform: 'OS X 10.6',
      version: '25'
    }
  ]
};
