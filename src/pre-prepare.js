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

var fs = require('fs');
var et = require('elementtree');
var xmldom = require('xmldom');
var path = require('path');
// Use double underscore because the Node REPL uses "_" to hold the result of the last operation.
var __ = require('underscore');
var utils = require('./utils');
var ccaManifestLogic = require('cca-manifest-logic');
var cordova = require('cordova');
var cordovaLib = cordova.cordova_lib;

// Returns a promise.
module.exports = exports = function prePrepareCommand(context) {
  // context is the Context object passed in by cordova-lib/HooksRunner.
  var pluginsToBeInstalled = [];
  var pluginsToBeNotInstalled = [];
  var pluginsNotRecognized = [];
  var manifest, whitelist;
  // Convert all plugin IDs to lower case (registry has problems with upper case).
  var installedPlugins = context.cordova.plugins.map(function(s) { return s.toLowerCase(); });

  var argv = require('optimist')
      .options('webview', { type: 'string' })
      .options('release', { type: 'boolean' })
      .options('link', { type: 'boolean' })
      .options('verbose', { type: 'boolean', alias: 'd' })
      .argv;

  // Pre-prepare manifest check and project munger
  return require('./get-manifest')('www')
  .then(function(m) {
    manifest = m;
    if (argv.webview) {
        manifest.webview = argv.webview;
    }

    return ccaManifestLogic.analyseManifest(manifest);
  })
  .then(function(manifestData) {
    pluginsToBeInstalled = manifestData.pluginsToBeInstalled.concat(['org.chromium.cca-hooks']);
    pluginsToBeNotInstalled = manifestData.pluginsToBeNotInstalled.concat();
    pluginsNotRecognized = manifestData.pluginsNotRecognized;
    whitelist = manifestData.whitelist;

    var configXmlData = fs.readFileSync('config.xml', 'utf8');
    var configXmlDom = new xmldom.DOMParser().parseFromString(configXmlData);
    ccaManifestLogic.updateConfigXml(manifest, manifestData, configXmlDom);
    var newConfigData = new xmldom.XMLSerializer().serializeToString(configXmlDom);
    // Don't write out if nothing actually changed
    if (newConfigData != configXmlData) {
      console.log('## Updating config.xml from manifest.json');
      fs.writeFileSync('config.xml', newConfigData);
    }
  })
  .then(function() {
    if ( (context.cordova.platforms.indexOf('android') != -1) && argv['release']) {
      if (!fs.existsSync('android-release-keys.properties')) {
        utils.fatal('Cannot build android in release mode: android-release-keys.properties not found in project root.');
      }
    }
    // Add a URL type to the iOS project's .plist file.
    // This is necessary for chrome.identity to redirect back to the app after authentication.
    var hasIos = fs.existsSync(path.join('platforms', 'ios'));
    if (hasIos) {
      var platforms = cordovaLib.cordova_platforms;
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
    var missingPlugins = __.difference(pluginsToBeInstalled, installedPlugins);
    var excessPlugins = __.intersection(installedPlugins, pluginsToBeNotInstalled);

    function pinVersion(pluginId, version) {
      var idx = missingPlugins.indexOf(pluginId);
      if (idx != -1) {
        missingPlugins[idx] += '@' + version;
      }
    }

    if (missingPlugins.length || excessPlugins.length || pluginsNotRecognized.length) {
      console.log('## Updating plugins based on manifest.json');
      pluginsNotRecognized.forEach(function(unknownPermission) {
        console.warn('Permission not recognized by cca: ' + unknownPermission + ' (ignoring)');
      });
      var opts = {
        link: argv.link,
        verbose: argv.verbose
      };
      var cmds = [];
      if (missingPlugins.length) {
        // Pin major versions of plugins that we care about
        pinVersion('cordova-plugin-chrome-apps-navigation', '1');
        pinVersion('cordova-plugin-chrome-apps-i18n', '2');
        pinVersion('cordova-plugin-chrome-apps-bootstrap', '2');
        pinVersion('cordova-plugin-crosswalk-webview', '1');

        cmds.push(['plugin', 'add', missingPlugins, opts]);
      }
      if (excessPlugins.length) {
        cmds.push(['plugin', 'rm', excessPlugins, opts]);
      }
      return require('./cordova-commands').runAllCmds(cmds);
    }
  })
  .then(function() {
    // After adding/removing plugins above, the list of installed plugins is:
    installedPlugins = __.difference(__.union(installedPlugins, pluginsToBeInstalled), pluginsToBeNotInstalled);
    // If chrome.identity is installed, we need a client id.
    if (installedPlugins.indexOf('cordova-plugin-chrome-apps-identity') >= 0) {
      if (!manifest.oauth2 || !manifest.oauth2.client_id) {
        console.warn('Warning: chrome.identity requires a client ID to be specified in the manifest.');
      }
    }

  });
};

