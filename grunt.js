/*global module:false*/
module.exports = function(grunt) {

  // Project configuration.
  var config = {
    clean: [ 'grunt_output' ],
    meta: {
      version: '0.1.0',
      api_banner: '/*! Cordova for Chrome - v<%= meta.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '* http://github.com/MobileChromeApps/\n' +
        '* Copyright (c) <%= grunt.template.today("yyyy") %> ' +
        'Google Inc.; Licensed MIT */'
    },
    lint: {
      files: ['grunt.js', 'api/**/!(prefix|suffix).js']
      // TODO(agrieve): Enable linting for spec.
      // files: ['grunt.js', 'api/**/!(prefix|suffix).js', 'spec/**/!(jasmine*).js']
    },
    concat: {
      api: {
        // This should ensure that the top-level API gets included first, before any other files or subdirectories.
        src: ['<banner:meta.api_banner>', 'api/prefix.js', 'api/chrome/**/*.js', 'api/helpers/**/*.js', 'api/chrome.js', 'api/suffix.js'],
        dest: 'grunt_output/api/chromeapi.js'
      }
    },
    min: {
      api: {
        src: ['<banner:meta.api_banner>', '<config:concat.api.dest>'],
        dest: 'grunt_output/api/chromeapi.min.js'
      }
    },
    watch: {
      files: ['!(grunt_output)', '!(grunt_output)/**/*'],
      tasks: 'default'
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
    uglify: {},
    copy: {
      spec: {
        files: {
          'grunt_output/spec/': 'spec/**' // Resolves symlinks.
        }
      },
      cordova_spec1: {
        files: {
          'grunt_output/cordova_spec/': 'spec/**'
        }
      },
      cordova_spec2: {
        files: {
          'grunt_output/cordova_spec/': [
            'integration/chrome*',
            'grunt_output/api/chromeapi.js'
          ],
          'grunt_output/cordova_spec/runtime/': [
            'integration/chrome*',
            'grunt_output/api/chromeapi.js'
          ]
        },
        options: {
          flatten: true
        }
      }
    }
  };

  grunt.initConfig(config);

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');

  grunt.registerTask('spec', 'concat copy');
  grunt.registerTask('default', 'lint concat copy');
};

