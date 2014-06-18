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

var Q = require('q');
var fs = require('fs');
var et = require('elementtree');
var path = require('path');
var utils = require('./utils');

// Returns a promise.
module.exports = exports = function prePrepareCommand() {
  var plugins = [];
  var manifest, whitelist;

  // Pre-prepare manifest check and project munger
  return require('./get-manifest')('www')
  .then(function(m) {
    manifest = m;
    return Q.when(require('./parse_manifest')(manifest));
  }).then(function(manifestData) {
    plugins = require('./plugin_map').DEFAULT_PLUGINS.concat(manifestData.plugins);
    whitelist = manifestData.whitelist;
    console.log('## Updating config.xml from manifest.json');
    return Q.ninvoke(fs, 'readFile', 'config.xml', {encoding: 'utf-8'});
  }).then(function(data) {
    var tree = et.parse(data);

    var widget = tree.getroot();
    if (widget.tag == 'widget') {
      widget.attrib.version = manifest.version;
      widget.attrib.id = manifest.packageId;
    }

    var name = tree.find('./name');
    if (name) name.text = manifest.name;

    var description = tree.find('./description');
    if (description) description.text = manifest.description;

    var author = tree.find('./author');
    if (author) author.text = manifest.author;

    var content = tree.find('./content');
    if (content) content.attrib.src = "plugins/org.chromium.bootstrap/chromeapp.html";

    var access;
    while ((access = widget.find('./access'))) {
      widget.remove(access);
    }
    whitelist.forEach(function(pattern, index) {
      var tag = et.SubElement(widget, 'access');
      tag.attrib.origin = pattern;
    });

    var configfile = et.tostring(tree.getroot(), {indent: 4});
    return Q.ninvoke(fs, 'writeFile', 'config.xml', configfile, { encoding: 'utf-8' });
  })

  // Add a URL type to the iOS project's .plist file.
  // This is necessary for chrome.identity to redirect back to the app after authentication.
  .then(function() {
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

  // Install missing plugins
  .then(function() {
    return require('cordova-lib/src/cordova/plugin')('ls');
  })
  .then(function(installedPlugins) {
    var missingPlugins = plugins.filter(function(p) {
      return installedPlugins.indexOf(p) == -1;
    });
    if (missingPlugins.length) {
      console.log('## Adding in new plugins based on manifest.json');
      var cmds = missingPlugins.map(function(pluginPath) {
        return ['plugin', 'add', pluginPath];
      });
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

    // If the Crosswalk rendering engine is installed, link the library
    if (installedPlugins.indexOf('org.apache.cordova.engine.crosswalk') >= 0) {
      return addXwalkLibraryCommand();
    } else {
      return removeXwalkLibraryCommand();
    }
  })
};

// Returns a promise. Adds a reference to the Crosswalk library project to the Android platform
function addXwalkLibraryCommand() {
  if (!fs.existsSync('platforms'))
    return Q.reject('No platforms directory found. Please run script from the root of your project.');
  if (!fs.existsSync(path.join('platforms', 'android')))
    return Q();

  return utils.processFile(path.join('platforms','android','project.properties'), function(lines) {
    var largestReference = 0;
    var found_xwalk = false;
    for (var i=0; i < lines.length; ++i) {
      var library_reference = lines[i].match(/^android.library.reference.(\d+)\s*=(.*)$/);
      if (library_reference) {
        var referenceNumber = parseInt(library_reference[1],10);
        if (referenceNumber > largestReference) {
          largestReference = referenceNumber;
        }
        found_xwalk = found_xwalk || !!library_reference[2].match(/xwalk_core_library$/);
      }
    }
    if (!found_xwalk) {
      lines.push('android.library.reference.' + (largestReference+1) + '=../../plugins/org.apache.cordova.engine.crosswalk/libs/xwalk_core_library');
    }
    return lines;
  });
}

// Returns a promise. Removes any references to the Crosswalk library project from the Android platform
function removeXwalkLibraryCommand() {
  if (!fs.existsSync('platforms'))
    return Q.reject('No platforms directory found. Please run script from the root of your project.');
  if (!fs.existsSync(path.join('platforms', 'android')))
    return Q();

  return utils.processFile(path.join('platforms','android','project.properties'), function(lines) {
    for (var i=lines.length-1; i >= 0; --i) {
      var xwalk_library_reference = lines[i].match(/^android.library.reference.(\d+)\s*=(.*)xwalk_core_library$/);
      if (xwalk_library_reference) {
        lines.splice(i, 1);
      }
    }
    return lines;
  });
}
