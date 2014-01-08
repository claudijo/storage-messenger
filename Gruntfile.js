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
        ignores: ['test/integration/selenium-webdriver-extract/**/*.js']
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
    }
  });

  // Load the task plugins
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-text-replace');
  grunt.loadNpmTasks('grunt-karma');

  // Default tasks.
  grunt.registerTask('default', ['concat', 'replace', 'jshint', 'uglify']);
};
