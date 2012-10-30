/*global module:false*/
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    meta: {
      version: '0.1.0',
      banner: '/*! Cordova for Chrome - v<%= meta.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '* http://github.com/MobileChromeApps/\n' +
        '* Copyright (c) <%= grunt.template.today("yyyy") %> ' +
        'Google Inc.; Licensed MIT */'
    },
    lint: {
      files: ['grunt.js', 'chrome/**/*.js', 'helpers/**/*.js'] // prefix.js and suffix.js are deliberately excluded, they would never pass.
    },
    concat: {
      dist: {
        // This should ensure that the top-level API gets included first, before any other files or subdirectories.
        src: ['<banner:meta.banner>', '<file_strip_banner:prefix.js>', '<file_strip_banner:chrome/**/*.js>', '<file_strip_banner:helpers/**/*.js', '<file_strip_banner:chrome.js', '<file_strip_banner:suffix.js>'],
        dest: 'dist/chromeapi.js'
      }
    },
    min: {
      dist: {
        src: ['<banner:meta.banner>', '<config:concat.dist.dest>'],
        dest: 'dist/chromeapi.min.js'
      }
    },
    watch: {
      files: '<config:lint.files>',
      tasks: 'lint'
    },
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        browser: true
      },
      globals: {
        exports: true,
        module: false
      }
    },
    uglify: {}
  });

  // Default task.
  grunt.registerTask('default', 'lint concat min');

};
