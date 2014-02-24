module.exports = {
  server: {
    address: function() {
      return 'http://127.0.0.1:4445/wd/hub';
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
