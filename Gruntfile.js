var semver = require('semver');
var currentVersion = require('./package.json').version;

module.exports = function(grunt) {

  // Project configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    concat: {
      release: {
        src: ['src/polyfill/**/*.js', 'src/core.js'],
        dest: '<%= pkg.name %>.js'
      }
    },

    preprocess: {
      options: {
        inline : true
      },
      dist: {
        src: '<%= pkg.name %>.js',
        dest: '<%= pkg.name %>.js'
      }
    },

    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        eqnull: true,
        browser: true,
        ignores: [
          'test/integration/selenium-webdriver-extract/**/*.js',
          'test/unit/coverage/**/*.js'
        ]
      },
      beforeConcat: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
      afterConcat: ['<%= pkg.name %>.js']
    },

    uglify: {
      release: {
        src: '<%= pkg.name %>.js',
        dest: '<%= pkg.name %>.min.js'
      }
    },

    replace: {
      versionPlaceholder: {
        src: '<%= pkg.name %>.js',
        overwrite: true,
        replacements: [{
          from: '@VERSION@',
          to: '<%= pkg.version %>'
        }]
      }
    },

    karma: {
      unit: {
        configFile: 'test/unit/config/karma.conf.js'
      },
      //continuous integration mode: run tests once in PhantomJS browser.
      continuous: {
        configFile: 'test/unit/config/karma.conf.js',
        singleRun: true,
        browsers: ['PhantomJS']
      },
      coverage: {
        configFile: 'test/unit/config/karma.conf.js',
        singleRun: true,
        reporters: ['coverage'],
        browsers: ['PhantomJS']
      }
    },

    shell: {
      options: {
        failOnError: true,
        stdout: true
      },
      docco: {
        // grunt-docco hangs, so we go for the shell version.
        command: './node_modules/docco/bin/docco -o doc <%= pkg.name %>.js'
      },
      gitpull: {
        command: 'git pull'
      },
      test: {
        command: 'node test/integration/basic-example'
      },
      'report-test-success': {
        command: 'curl -H "Content-Type:text/json" -s -X PUT -d \'{"passed": true}\' http://' + process.env.SAUCE_USERNAME + ':' + process.env.SAUCE_ACCESS_KEY + '@saucelabs.com/rest/v1/claudijo/jobs/' + process.env.TRAVIS_JOB_NUMBER
      }
    },

    checkrepo: {
      cleanWorkingTree: {
        clean: true
      }
    },

    bump: {
      options: {
        commit: false,
        push: false,
        createTag: false,
        updateConfigs: ['pkg'],
        commitFiles: ['-a'] // Commit all files.
      }
    },

    prompt: {
      version: {
        options: {
          questions: [
            {
              config: 'bump.next',
              type: 'list',
              message: 'Bump version from ' + '<%= pkg.version %>'.cyan + ' to:',
              choices: [
                {
                  value: semver.inc(currentVersion, 'patch'),
                  name: 'Patch:  '.yellow + semver.inc(currentVersion, 'patch').yellow +
                      '  Backwards-compatible bug fixes.'
                }, {
                  value: semver.inc(currentVersion, 'minor'),
                  name: 'Minor:  '.yellow + semver.inc(currentVersion, 'minor').yellow +
                      '  Add functionality in a backwards-compatible manner.'
                }, {
                  value: semver.inc(currentVersion, 'major'),
                  name: 'Major:  '.yellow + semver.inc(currentVersion, 'major').yellow +
                      '  Incompatible API changes.'
                }, {
                  value: 'custom',
                  name: 'Custom: ?.?.?'.yellow +
                      '  Specify version...'
                }
              ]
            }, {
              config: 'bump.custom',
              type: 'input',
              message: 'What specific version would you like',
              when: function (answers) {
                return answers['bump.next'] === 'custom';
              },
              validate: function (value) {
                var newVersion = semver.valid(value);

                if (!newVersion) {
                  return 'Must be a valid semver, such as 1.2.3-rc1. See ' +
                      'http://semver.org/'.blue.underline + ' for more details.';
                }

                if (semver.lt(newVersion, currentVersion)) {
                  return 'New version ' + newVersion.yellow + ' must be ' +
                      'greated than current version ' + currentVersion.yellow +
                      '.';
                }

                return true;
              }
            }, {
              config: 'bump.confirm',
              type: 'confirm',
              default: false,
              message: 'Are you happy with this, and ready to make a new release?'
            }
          ]
        }
      }
    },

    connect: {
      server: {
        options: {
          port: 9001,
          base: './'
        }
      }
    }
  });

  // Load the task plugins
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-text-replace');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-preprocess');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks('grunt-checkrepo');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks('grunt-prompt');

  // Lint and test source files. This task is run by npm test, ie. the default
  // action for Travic-CI.
  grunt.registerTask('validate-and-test-src', [
    'jshint:beforeConcat',
    'unit-test',
    'integration-test'
  ]);

  grunt.registerTask('unit-test', [
    'karma:coverage'
  ]);

  grunt.registerTask('integration-test', [
    'connect:server',
     'shell:test',
     'shell:report-test-success'
  ]);

  grunt.registerTask('bump-version', [
    'prompt:version',
    'update-version'
  ]);

  grunt.registerTask('update-pkg-version-and-confirm', '', function() {
    if(!grunt.config('bump.confirm')) {
      grunt.warn('Aborted by user.');
    }

    grunt.option('setversion', grunt.config('bump.custom') || grunt.config('bump.next'));
    grunt.task.run('bump:bump-only');
  });

  grunt.registerTask('prepare-and-check-working-tree', [
    'shell:gitpull',
    'checkrepo:cleanWorkingTree'
  ]);

  grunt.registerTask('build-and-validate-release', [
    'concat:release',
    'preprocess:dist',
    'jshint:afterConcat'
  ]);

  grunt.registerTask('update-release-version-and-confirm', [
    'prompt:version',
    'update-pkg-version-and-confirm',
    'replace:versionPlaceholder',
  ]);

  grunt.registerTask('create-minified-release-version', [
    'uglify:release'
  ]);

  grunt.registerTask('publish-release', [

  ]);

  grunt.registerTask('create-doc-and-publish-to-gh-pages', [
    'shell:docco'
  ]);

  grunt.registerTask('release', [
    'prepare-and-check-working-tree',
    'validate-and-test-src',
    'build-and-validate-release',
    'update-release-version-and-confirm',
    'create-minified-release-version',
    'publish-release',
    'create-doc-and-publish-to-gh-pages'
  ]);

};
