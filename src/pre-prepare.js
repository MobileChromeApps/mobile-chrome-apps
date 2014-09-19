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

'use strict';

var Q = require('q');
var fs = require('fs');
var et = require('elementtree');
var path = require('path');
var utils = require('./utils');

// Returns a promise.
module.exports = exports = function prePrepareCommand() {
  var pluginsToBeInstalled = [];
  var pluginsToBeNotInstalled = [];
  var pluginsNotRecognized = [];
  var manifest, whitelist;

  var cordovaCmdline = process.env['CORDOVA_CMDLINE'].split(/\s+/);
  var argv = require('optimist')(cordovaCmdline)
      .options('webview', { type: 'string' })
      .options('release', { type: 'boolean' })
      .argv;

  // Pre-prepare manifest check and project munger
  return require('./get-manifest')('www')
  .then(function(m) {
    manifest = m;
    return require('./parse-manifest')(manifest, { webview: argv.webview });
  })
  .then(function(manifestData) {
    pluginsToBeInstalled = manifestData.pluginsToBeInstalled.concat(require('./plugin-map').DEFAULT_PLUGINS);
    pluginsToBeNotInstalled = manifestData.pluginsToBeNotInstalled.concat(require('./plugin-map').STALE_PLUGINS);
    pluginsToBeNotInstalled = pluginsToBeNotInstalled.filter(function(plugin) {
      return pluginsToBeInstalled.indexOf(plugin) == -1;
    });
    pluginsNotRecognized = manifestData.pluginsNotRecognized;
    whitelist = manifestData.whitelist;
  })
  .then(require('./update-config-xml'))
  .then(function() {
    if (/android/.exec(process.env['CORDOVA_PLATFORMS']) && argv['release']) {
      if (!process.env.RELEASE_SIGNING_PROPERTIES_FILE) {
        utils.fatal('Cannot build android in release mode: android-release-keys.properties not found in project root.')
      }
    }
    // Add a URL type to the iOS project's .plist file.
    // This is necessary for chrome.identity to redirect back to the app after authentication.
    var hasIos = fs.existsSync(path.join('platforms', 'ios'));
    if (hasIos) {
      var platforms = require('cordova-lib').cordova_platforms;
      var parser = new platforms.ios.parser(path.join('platforms','ios'));
      var infoPlistPath = path.join('platforms', 'ios', parser.originalName, parser.originalName + '-Info.plist');
      var infoPlistXml = et.parse(fs.readFileSync(infoPlistPath, 'utf-8'));

      var rootPlistElement = infoPlistXml.getroot();
      var rootDictElement = rootPlistElement.getItem(0);

      var bundleUrlTypesKey = et.SubElement(rootDictElement, 'key');
      bundleUrlTypesKey.text = 'CFBundleURLTypes';
      var bundleUrlTypesArray = et.SubElement(rootDictElement, 'array');
      var bundleUrlTypesDict = et.SubElement(bundleUrlTypesArray, 'dict');

      var bundleTypeRoleKey = et.SubElement(bundleUrlTypesDict, 'key');
      bundleTypeRoleKey.text = 'CFBundleTypeRole';
      var bundleTypeRoleString = et.SubElement(bundleUrlTypesDict, 'string');
      bundleTypeRoleString.text = 'Editor';

      var bundleUrlNameKey = et.SubElement(bundleUrlTypesDict, 'key');
      bundleUrlNameKey.text = 'CFBundleURLName';
      var bundleUrlNameString = et.SubElement(bundleUrlTypesDict, 'string');
      bundleUrlNameString.text = manifest.packageId;

      var bundleUrlSchemesKey = et.SubElement(bundleUrlTypesDict, 'key');
      bundleUrlSchemesKey.text = 'CFBundleURLSchemes';
      var bundleUrlSchemesArray = et.SubElement(bundleUrlTypesDict, 'array');
      var bundleUrlSchemeString = et.SubElement(bundleUrlSchemesArray, 'string');
      bundleUrlSchemeString.text = manifest.packageId;

      fs.writeFileSync(infoPlistPath, infoPlistXml.write({indent: 4}), 'utf-8');
    }
  })
  .then(function() {
    // Update installed plugins
    return require('cordova-lib/src/cordova/plugin')('ls');
  })
  .then(function(installedPlugins) {
    // Convert all plugin IDs to lower case (registry has problems with upper case).
    installedPlugins = installedPlugins.map(function(s) {return s.toLowerCase()})
    var missingPlugins = pluginsToBeInstalled.filter(function(p) {
      return installedPlugins.indexOf(p) == -1;
    });
    var excessPlugins = pluginsToBeNotInstalled.filter(function(p) {
      return installedPlugins.indexOf(p) != -1;
    });
    if (missingPlugins.length || excessPlugins.length || pluginsNotRecognized.length) {
      console.log('## Updating plugins based on manifest.json');
      pluginsNotRecognized.forEach(function(unknownPermission) {
        console.warn('Permission not recognized by cca: ' + unknownPermission + ' (ignoring)');
      });
      var cmds = missingPlugins.map(function(plugin) {
        return ['plugin', 'add', plugin];
      }).concat(excessPlugins.map(function(plugin) {
        return ['plugin', 'rm', plugin];
      }));
      return require('./cordova-commands').runAllCmds(cmds);
    }
  })
  .then(function() {
    return require('cordova-lib/src/cordova/plugin')('ls');
  })
  .then(function(installedPlugins) {
    // If chrome.identity is installed, we need a client id.
    if (installedPlugins.indexOf('org.chromium.identity') >= 0) {
      if (!manifest.oauth2 || !manifest.oauth2.client_id) {
        console.warn('Warning: chrome.identity requires a client ID to be specified in the manifest.');
      }
    }

  });
};

