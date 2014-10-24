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

var pluginMaps = require('./plugin-maps');
var DEFAULT_PLUGINS = pluginMaps.DEFAULT_PLUGINS;
var PLUGIN_MAP = pluginMaps.PLUGIN_MAP;
var STALE_PLUGINS = pluginMaps.STALE_PLUGINS;
var ENGINE_MAP = pluginMaps.ENGINE_MAP;
var SOCKETS_MAP = pluginMaps.SOCKETS_MAP;

function mapPermissionsToPlugins(knownPermissionsMap, requestedPermissionsList) {
  // We have to create three lists:
  // 1. Permissions your app has requested and we know about (install these plugins)
  // 2. Permissions your app has requested and we do not know about (warn about these)
  // 3. Permissions your app has not requested (uninstall these plugins)
  var ret = {
    toInstall: [],
    toUninstall: [],
    unknown: [],
  };

  var knownPermissionsList = Object.keys(knownPermissionsMap);
  requestedPermissionsList = requestedPermissionsList.slice(); // deep copy so we can modify in-place

  requestedPermissionsList.forEach(function(requestedPermission) {
    // Is this permission known?
    var idx = knownPermissionsList.indexOf(requestedPermission);
    if (idx != -1) {
      ret.toInstall = ret.toInstall.concat(knownPermissionsMap[requestedPermission]);
      // Remove from the list of known permissions, so that at the end of this we have all known permissions that arent requested
      knownPermissionsList.splice(idx,1);
    } else {
      ret.unknown.push(requestedPermission);
    }
  });
  // Uninstall whatever is left, since it was not requested
  knownPermissionsList.forEach(function(permission) {
    ret.toUninstall = ret.toUninstall.concat(knownPermissionsMap[permission]);
  });
  // Final step, bit of a hack, remove duplicate plugins from toUninstall list that exist in toInstall
  // e.g. syncFS depends on identity.  So, even if identity isn't in your manifest, don't uninstal it if you have syncFS
  // The way we handle this is to add org.chromium.identity to the list of plugins to install for the syncFS permission
  // so, the last thing to do is subtract the plugins to install from the plugins to not install, since there can be overlap.
  ret.toUninstall = ret.toUninstall.filter(function(plugin) {
    return ret.toInstall.indexOf(plugin) == -1;
  });

  return ret;
}

module.exports = function analyseManifest(manifest, options) {
  options = options || {};
  var ret = {
    appId: undefined,
    whitelist: [],
    permissions: [],
    pluginsToBeInstalled: [],
    pluginsToBeNotInstalled: [],
    pluginsNotRecognized: [],
  };

  (manifest.permissions || []).forEach(function(permission) {
    if (typeof permission === "object") {
      ret.permissions = ret.permissions.concat(Object.keys(permission));
    } else if (permission === "<all_urls>") {
      ret.whitelist.push("*");
    } else {
      var matchPatternParts = /([^:]+:\/\/[^\/]+)(\/.*)$/.exec(permission);
      if (matchPatternParts) {
        // Disregard paths in host permissions: path is required, but
        // <scheme>://<host>/<any path> should translate to <scheme>://<host>/*
        ret.whitelist.push(matchPatternParts[1] + "/*");
      } else {
        ret.permissions.push(permission);
      }
    }
  });

  var pluginsForPermissions = mapPermissionsToPlugins(PLUGIN_MAP, ret.permissions);
  var pluginsForEngines = mapPermissionsToPlugins(ENGINE_MAP, [options.webview || manifest.webview || "crosswalk"]);
  var pluginsForSockets = mapPermissionsToPlugins(SOCKETS_MAP, Object.keys(manifest.sockets || {}));

  ret.pluginsToBeInstalled = [].concat.apply([], [
      pluginsForPermissions.toInstall,
      pluginsForEngines.toInstall,
      pluginsForSockets.toInstall,
      DEFAULT_PLUGINS
    ]);
  ret.pluginsToBeNotInstalled = [].concat.apply([], [
      pluginsForPermissions.toUninstall,
      pluginsForEngines.toUninstall,
      pluginsForSockets.toUninstall,
      STALE_PLUGINS
    ]);
  ret.pluginsNotRecognized = pluginsForPermissions.unknown.concat(pluginsForSockets.unknown);

  // This should happen rarely
  pluginsForEngines.unknown.forEach(function(unknownEngine) {
    console.warn('Engine not supported by cca: ' + unknownEngine + ' (skipping)');
  });

  if (manifest.key) {
    ret.appId = require('./chrome-app-key-to-id')(manifest.key);
  } else {
    ret.appId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  }

  return ret;
};
