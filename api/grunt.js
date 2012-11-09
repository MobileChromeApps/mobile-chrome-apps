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
      files: ['grunt.js', 'chrome.js', 'chrome/**/*.js', 'helpers/**/*.js'] // prefix.js and suffix.js are deliberately excluded, they would never pass.
    },
    concat: {
      dist: {
        // This should ensure that the top-level API gets included first, before any other files or subdirectories.
        src: ['<banner:meta.banner>', 'prefix.js', 'chrome/**/*.js', 'helpers/**/*.js', 'chrome.js', 'suffix.js'],
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
      files: ['<config:lint.files>', 'grunt.js', 'suffix.js', 'prefix.js', 'chrome.js'],
      tasks: 'lint concat min'
    },
    jshint: {
      options: {
        boss: true,
        curly: true,
        eqnull: true,
        evil: true, // Complains about document.write otherwise. We still shouldn't use eval() itself.
        immed: true,
        indent: 2,
        latedef: true,
        newcap: true,
        noarg: true,
        quotmark: 'single',
        sub: true,
        trailing: true,
        undef: true,
        unused: true,
        white: false,

        browser: true, // document, window, navigator, etc.
        devel: true    // console, alert, etc.
      },
      globals: {
        cordova: false,
        unsupportedApi: false,
        define: false
      }
    },
    uglify: {}
  });

  // Default task.
  grunt.registerTask('default', 'lint concat min');

};
