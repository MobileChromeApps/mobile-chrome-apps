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

var getManifest = require('./get-manifest');
var ccaManifestLogic = require('cca-manifest-logic');
var Q = require('q');

// Returns a promise.
module.exports = exports = function beforePluginAdd(context) {
  return getManifest('www')
    .then(function(manifest) {
      return ccaManifestLogic.analyseManifest(manifest);
    })
    .then(function(manifestData) {
      var pluginsToBeNotInstalled = manifestData.pluginsToBeNotInstalled.concat();
      var pluginsBeingInstalledRightNow = context.plugins;

      pluginsToBeNotInstalled = pluginsToBeNotInstalled.filter(function(plugin) {
        return pluginsBeingInstalledRightNow.indexOf(plugin) != -1;
      });

      if (pluginsToBeNotInstalled.length === 0) return;

      console.error("Error: The following plugin(s) cannot be explicitly installed:");
      pluginsToBeNotInstalled.forEach(function(plugin) {
        console.warn("*", plugin);
      });
      console.error("Instead, add the proper manifest.json permissions.");
      console.error("See: https://developer.chrome.com/apps/manifest");

      return Q.reject("Abort plugin add");
    });
};
