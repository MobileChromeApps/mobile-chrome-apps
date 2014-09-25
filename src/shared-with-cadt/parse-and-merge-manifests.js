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

// Returns a promise for the manifest contents.
module.exports = exports = function parseAndMergeManifests(manifestPath, platform, readFileFunc, Q) {
  var manifestMobilePath = manifestPath.replace(/manifest.json$/, 'manifest.mobile.json');
  var manifest, manifestMobile;

  return readFileFunc(manifestPath).then(function(manifestData) {
    try {
      // jshint evil:true
      manifest = eval('(' + manifestData + ')');
      // jshint evil:false
    } catch (e) {
      console.error(e);
      throw new Error('Unable to parse manifest ' + manifestPath);
    }
    return readFileFunc(manifestMobilePath).then(function(manifestMobileData) {
      try {
        // jshint evil:true
        manifestMobile = eval('(' + manifestMobileData + ')');
        // jshint evil:false
      } catch (e) {
        console.error(e);
        throw new Error('Unable to parse manifest ' + manifestPath);
      }
    }, function(err) {
      // Swallow any errors opening the mobile manifest, it's not required.
    }).then(function() {
      var extend = require('node.extend');
      manifest = extend(true, manifest, manifestMobile); // true -> deep recursive merge of these objects
      // If you want a specific platform manifest, also merge in its platform specific settings
      if (platform && platform in manifest) {
        manifest = extend(true, manifest, manifest[platform]);
      }
      return manifest;
    });
  }, function(err) {
    throw new Error('Unable to open manifest ' + manifestPath + ' for reading.');
  });
};
