// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

module.exports = function(grunt) {
  'use strict';

  var defaultJsHintOptions = {
    boss: true, // Allow for (var i = 0, person; person = people[i]; i++) {}
    curly: true,
    expr: true, // Allow this.callback && this.callback();
    eqnull: true,
    evil: true, // Complains about document.write otherwise. We still shouldn't use eval() itself.
    immed: true,
    indent: 2,
    latedef: true,
    newcap: true,
    noarg: true,
    noempty: true,
    nonew: true,
    proto: true, // Allow use of __proto__
    quotmark: 'single',
    sub: true,
    trailing: true,
    undef: true,
    unused: true,
    white: false,
    devel: true    // console, alert, etc.
  };

  function mergeObjs(o1, o2) {
    var ret = {};
    for (var key in o1) {
      ret[key] = o1[key];
    }
    for (key in o2) {
      ret[key] = o2[key];
    }
    return ret;
  }

  // Project configuration.
  var config = {
    clean: [ 'grunt_output' ],
    meta: {
      version: '0.1.0',
      api_banner:
        '// Copyright (c) <%= grunt.template.today("yyyy") %> The Chromium Authors. All rights reserved.\n' +
        '// Use of this source code is governed by a BSD-style license that can be\n' +
        '// found in the LICENSE file.\n' +
        '// http://github.com/MobileChromeApps/chrome-cordova\n' +
        '// Built on <%= grunt.template.today("yyyy-mm-dd") %>\n'
    },
    lint: {
      api: ['api/**/!(prefix|suffix).js'],
      grunt: ['grunt.js'],
      spec: ['spec/**/!(jasmine*).js']
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
      api: {
        files: ['api/**/*.js'],
        tasks: 'api copy:cordova_spec2'
      },
      spec: {
        files: ['spec/**/*', 'integration/*', 'third_party/**/*'],
        tasks: 'spec'
      }
    },
    jshint: {
      // Options for all targets (http://www.jshint.com/docs/).
      // Per-taget options.
      api: {
        options: mergeObjs(defaultJsHintOptions, {
          browser: true, // document, window, navigator, etc.
          forin: true // Apps may add things to Object.prototype.
        }),
        globals: {
          cordova: false,
          unsupportedApi: false, // TODO(agrieve): Remove.
          define: false
        }
      },
      grunt: {
        options: mergeObjs(defaultJsHintOptions, {
          node: true
        })
      },
      spec: {
        options: mergeObjs(defaultJsHintOptions, {
          browser: true,
          undef: false, // TODO(agrieve): Modularize spec js.
          unused: false
        })
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
          'grunt_output/cordova_spec/fileSystem/': [
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

  grunt.renameTask('watch', '_watch');
  grunt.registerTask('api', 'lint:api concat');
  grunt.registerTask('spec', 'api lint:spec copy');
  grunt.registerTask('build', 'lint:grunt spec');
  grunt.registerTask('watch', 'clean build _watch');
  grunt.registerTask('default', 'clean build');
};

