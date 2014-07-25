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


/*
 * NOTE!
 * If you remove/rename a plugin from these lists, add the old value to the STALE_PLUGINS list at the end.
 * That way, it will be automatically removed on prepare.
 * */

exports.DEFAULT_PLUGINS = [
    'org.apache.cordova.file',
    'org.apache.cordova.inappbrowser',
    'org.apache.cordova.network-information',
    'org.apache.cordova.statusbar',
    'org.apache.cordova.labs.keyboard',
    'org.chromium.common',
    'org.chromium.runtime',
    'org.chromium.storage',
    'org.chromium.navigation',
    'org.chromium.bootstrap',
    'org.chromium.i18n',
    'org.chromium.polyfill.CustomEvent',
    'org.chromium.polyfill.xhr_features',
    'org.chromium.polyfill.blob_constructor',
];

exports.PLUGIN_MAP = {
  'alarms': ['org.chromium.alarms', 'org.chromium.storage'],
  'audioCapture': ['org.chromium.audioCapture'],
  'background': [],
  'fileSystem': ['org.chromium.fileSystem', 'org.chromium.FileChooser'],
  'fullscreen': [],
  'gcm': ['org.chromium.gcm', 'org.chromium.storage'],
  'geolocation': ['org.apache.cordova.geolocation'],
  'identity': ['org.chromium.identity'],
  'idle': ['org.chromium.idle'],
  'notifications': ['org.chromium.notifications', 'org.chromium.storage'],
  'payments': ['com.google.payments'],
  'power': ['org.chromium.power'],
  'pushMessaging': ['org.chromium.pushMessaging', 'org.chromium.identity'],
  'socket': ['org.chromium.socket'],
  'storage': ['org.chromium.storage'],
  'syncFileSystem': ['org.chromium.syncFileSystem', 'org.chromium.storage', 'org.chromium.identity'],
  'system.network': ['org.chromium.system.network'],
  'unlimitedStorage': [],
  'videoCapture': ['org.chromium.videoCapture'],
};

exports.STALE_PLUGINS = [
];

exports.ENGINE_MAP = {
  'crosswalk': ['org.apache.cordova.engine.crosswalk'],
  'system': []
};

exports.PLUGIN_DEPS = {
};
