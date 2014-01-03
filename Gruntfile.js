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
        globals: {
          StorageMessenger: false,
          require: false,
          beforeEach: false,
          afterEach: false
        },
        ignores: ['test/integration/selenium-webdriver-extract/**/*.js']
      },
      beforeconcat: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
      afterconcat: ['<%= pkg.name %>.js']
    },
    uglify: {
//      options: {
//        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
//      },
      build: {
        src: '<%= pkg.name %>.js',
        dest: '<%= pkg.name %>.min.js'
      }
    }
  });

  // Load the task plugins
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jasmine');

  // Default tasks.
  grunt.registerTask('default', ['concat', 'jshint', 'uglify']);
};
