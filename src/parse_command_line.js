/**
  Licensed to the Apache Software Foundation (ASF) under one
  or more contributor license agreements.  See the NOTICE file
  distributed with this work for additional information
  regarding copyright ownership.  The ASF licenses this file
  to you under the Apache License, Version 2.0 (the
  "License"); you may not use this file except in compliance
  with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing,
  software distributed under the License is distributed on an
  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  KIND, either express or implied.  See the License for the
  specific language governing permissions and limitations
  under the License.
 */

var optimist = require('optimist');
var path = require('path');

module.exports = exports = function parseCommandLine() {
  var pathToApp = '<' + path.join('path', 'to', 'app') + '>';
  return optimist
      .usage('Usage: $0 <command> [commandArgs]\n' +
             '\n' +
             'checkenv - Ensures that your environment is setup correctly.\n' +
             '    Example:\n' +
             '        cca checkenv\n' +
             '\n' +
             'create <directory> [--android] [--ios] [--copy-from=' + pathToApp + ' | --link-to=' + pathToApp + '] - Creates a project.\n' +
             '    Details:\n' +
             '        <directory>: The directory to create the project in.\n' +
             '        --android: Add the Android platform (default if android SDK is detected).\n' +
             '        --ios: Add the iOS platform (default if Xcode is detected).\n' +
             '        --copy-from=' + pathToApp + ': Create a project based on the given Chrome App.\n' +
             '        --link-to=' + pathToApp + ': Create a project that symlinks to the given Chrome App.\n' +
             '\n' +
             'platform [{add|remove|rm} <PLATFORM>] ..... add or remove a specified PLATFORM, OR\n' +
             '         [{list|ls}] ...................... list all installed and available platforms\n' +
             '         [{update|up} <PLATFORM>] ......... update the version of Cordova used for a specific\n' +
             '                                            PLATFORM; use after updating the CLI.\n' +
             '\n' +
             'plugin [{add|remove|rm} <PATH|URI>] ....... add or remove a plugin from the specified PATH or URI, OR\n' +
             '       [{ls|list}] ........................ list all currently installed plugins\n' +
             '       [search <keyword1 keyword2...>] .... search the plugin registry for plugins matching the keywords\n' +
             '\n' +
             'prepare [PLATFORM..] ...................... copies files for specified platforms, or all platforms,\n' +
             '                                            so that the project is ready to build in each SDK\n' +
             '\n' +
             'build [PLATFORM...] ....................... shortcut for prepare, then compile\n' +
             '\n' +
             'run [--debug|--release]\n' +
             '    [--device|--emulator|--target=FOO]\n' +
             '    [PLATFORM] ............................ deploys app on specified platform devices / emulators\n' +
             '\n' +
             'serve [PORT] .............................. runs a local web server for www/ assets. Port defaults to 8000.\n' +
             '                                            Access projects at: http://HOST_IP:PORT/PLATFORM/www\n' +
             'Examples:\n' +
             '    cca create MyApp\n' +
             '    cca create MyApp --link-to=' + pathToApp + '\n' +
             '    cca prepare\n' +
             '    cca run android --device\n' +
             '    cca run ios --emulator\n' +
             '    cca plugin ls'
      ).options('h', {
          type: 'boolean',
          alias: 'help',
          desc: 'Show usage message.'
      }).options('d', {
          type: 'boolean',
          alias: 'verbose',
          desc: 'Enable verbose logging.'
      }).options('v', {
          type: 'boolean',
          alias: 'version',
          desc: 'Show version.'
      }).options('android', { type: 'boolean'
      }).options('ios', { type: 'boolean'
      }).options('pause_on_exit', { type: 'boolean'
      }).options('copy-from', { type: 'string'
      }).options('link-to', { type: 'string'
      }).argv;
};
