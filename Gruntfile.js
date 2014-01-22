module.exports = function(grunt) {

  // Project configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      dist: {
        src: ['src/polyfill/**/*.js', 'src/core.js'],
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
      beforeconcat: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
      afterconcat: ['<%= pkg.name %>.js']
    },
    uglify: {
      build: {
        src: '<%= pkg.name %>.js',
        dest: '<%= pkg.name %>.min.js'
      }
    },
    replace: {
      version: {
        src: '<%= pkg.name %>.js',
        overwrite: true,
        replacements: [{
          from: '@VERSION@',
          to: '<%= pkg.version %>'
        }]
      }
    },
    preprocess: {
      js: {
        src: '<%= pkg.name %>.js',
        dest: '<%= pkg.name %>.js'
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
      }
    },
    docco: {
      debug: {
        src: ['<%= pkg.name %>.js'],
        options: {
          output: 'doc/'
        }
      }
    }
  });

  // Load the task plugins
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-text-replace');
  grunt.loadNpmTasks('grunt-preprocess');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-docco');

  // Default tasks.
  grunt.registerTask('default', [
    'concat',
    'replace',
    'jshint',
    'preprocess',
    'docco',
    'uglify'
  ]);
};
