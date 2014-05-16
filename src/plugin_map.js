#!/usr/bin/env node
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


exports.DEFAULT_PLUGINS = [
    'org.apache.cordova.file',
    'org.apache.cordova.inappbrowser',
    'org.apache.cordova.network-information',
    'org.apache.cordova.keyboard',
    'org.apache.cordova.statusbar',
    'org.chromium.navigation',
    'org.chromium.bootstrap',
    'org.chromium.i18n',
    'org.chromium.polyfill.CustomEvent',
    'org.chromium.polyfill.xhr_features',
    'org.chromium.polyfill.blob_constructor',
];

exports.PLUGIN_MAP = {
  'alarms': ['org.chromium.alarms'],
  'fileSystem': ['org.chromium.fileSystem',
                 'org.chromium.FileChooser'],
  'gcm': ['org.chromium.gcm'],
  'identity': ['org.chromium.identity'],
  'idle': ['org.chromium.idle'],
  'notifications': ['org.chromium.notifications'],
  'payments': ['com.google.payments'],
  'power': ['org.chromium.power'],
  'pushMessaging': ['org.chromium.pushMessaging'],
  'socket': ['org.chromium.socket'],
  'storage': ['org.chromium.storage'],
  'syncFileSystem': ['org.chromium.syncFileSystem'],
  'unlimitedStorage': [],
  'background': [],
  'fullscreen': [],
};
