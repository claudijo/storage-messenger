module.exports = {
  server: {
    address: function() {
      return 'http://127.0.0.1:4445/wd/hub';
    }
  },

  browsersToTest: [
    {
      browserName: 'firefox',
      platform: 'Windows 7',
      version: '27'
    }, {
      browserName: 'firefox',
      platform: 'Windows 7',
      version: '3.5'
    }, {
      browserName: 'internet explorer',
      platform: 'Windows 8.1',
      version: '11'
    }, {
      browserName: 'internet explorer',
      platform: 'Windows 7',
      version: '10'
    }, {
      browserName: 'internet explorer',
      platform: 'Windows 7',
      version: '9'
    }, {
      browserName: 'internet explorer',
      platform: 'Windows 7',
      version: '8'
    }, {
      browserName: 'safari',
      platform: 'OS X 10.9',
      version: '7'
    }, {
      browserName: 'safari',
      platform: 'OS X 10.8',
      version: '6'
    }, {
      browserName: 'safari',
      platform: 'OS X 10.6',
      version: '5'
    },  {
      browserName: 'chrome',
      platform: 'Windows 7',
      version: '32'
    }, {
      browserName: 'opera',
      platform: 'Windows 7',
      version: '12'
    }, {
      browserName: 'opera',
      platform: 'Windows 7',
      version: '11'
    }, {
      browserName: 'ipad',
      platform: 'OS X 10.6',
      version: '4'
    }, {
      browserName: 'andriod',
      platform: 'linux',
      version: '4.3'
    }, {
      browserName: 'andriod',
      platform: 'linux',
      version: '4.0'
    }
  ]
};
