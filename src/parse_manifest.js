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

module.exports = function parseManifest(manifest) {
  var permissions = [],
      chromeAppId,
      whitelist = [],
      plugins = [],
      i;
  if (manifest.permissions) {
    for (i = 0; i < manifest.permissions.length; ++i) {
      if (typeof manifest.permissions[i] === "string") {
        var matchPatternParts = /([^:]+:\/\/[^\/]+)(\/.*)$/.exec(manifest.permissions[i]);
        if (matchPatternParts) {
          // Disregard paths in host permissions: path is required, but
          // <scheme>://<host>/<any path> should translate to <scheme>://<host>/*
          whitelist.push(matchPatternParts[1] + "/*");
        } else if (manifest.permissions[i] === "<all_urls>") {
          whitelist.push("*");
        } else {
          permissions.push(manifest.permissions[i]);
        }
      } else {
        permissions = permissions.concat(Object.keys(manifest.permissions[i]));
      }
    }

    for (i = 0; i < permissions.length; i++) {
      var pluginsForPermission = require('./plugin_map').PLUGIN_MAP[permissions[i]];
      if (pluginsForPermission) {
        for (var j = 0; j < pluginsForPermission.length; ++j) {
          plugins.push(pluginsForPermission[j]);
        }
      } else {
        console.warn('Permission not supported by cca: ' + permissions[i] + ' (skipping)');
      }
    }
  }

  // Note: chromeAppId is not currently used.
  if (manifest.key) {
    chromeAppId = require('./util/chrome_app_key_to_id')(manifest.key);
  } else {
    // All zeroes -- should we use rand() here instead?
    chromeAppId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  }

  return {
    appId: chromeAppId,
    whitelist: whitelist,
    plugins: plugins,
    permissions: permissions,
  };
};
