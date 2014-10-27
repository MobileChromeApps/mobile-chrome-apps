/*
 * NOTE!
 * If you remove/rename a plugin from these lists, add the old value to the STALE_PLUGINS list at the end.
 * That way, it will be automatically removed on prepare.
 * */


var DEFAULT_PLUGINS = [
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
    'org.chromium.polyfill.customevent',
    'org.chromium.polyfill.xhr_features',
    'org.chromium.polyfill.blob_constructor',
];

var PLUGIN_MAP = {
  'alarms': ['org.chromium.alarms', 'org.chromium.storage'],
  'audioCapture': ['org.chromium.audiocapture'],
  'background': [],
  'fileSystem': ['org.chromium.filesystem', 'org.chromium.filechooser'],
  'fullscreen': [],
  'gcm': ['org.chromium.gcm', 'org.chromium.storage'],
  'geolocation': ['org.apache.cordova.geolocation'],
  'identity': ['org.chromium.identity'],
  'idle': ['org.chromium.idle'],
  'notifications': ['org.chromium.notifications', 'org.chromium.storage'],
  'payments': ['com.google.payments'],
  'power': ['org.chromium.power'],
  'pushMessaging': ['org.chromium.pushmessaging', 'org.chromium.identity'],
  'socket': ['org.chromium.socket', 'org.chromium.system.network'],
  'storage': ['org.chromium.storage'],
  'syncFileSystem': ['org.chromium.syncfilesystem', 'org.chromium.storage', 'org.chromium.identity'],
  'system.cpu': ['org.chromium.system.cpu'],
  'system.display': ['org.chromium.system.display'],
  'system.memory': ['org.chromium.system.memory'],
  'system.network': ['org.chromium.system.network'],
  'system.storage': ['org.chromium.system.storage'],
  'unlimitedStorage': [],
  'videoCapture': ['org.chromium.videocapture'],
};

var STALE_PLUGINS = [];

var ENGINE_MAP = {
  'crosswalk': ['org.apache.cordova.engine.crosswalk'],
  'system': []
};

var SOCKETS_MAP = {
  'udp': ['org.chromium.sockets.udp'],
  'tcp': ['org.chromium.sockets.tcp'],
  'tcpServer': ['org.chromium.sockets.tcpserver'],
};


exports.DEFAULT_PLUGINS = DEFAULT_PLUGINS;
exports.PLUGIN_MAP = PLUGIN_MAP;
exports.STALE_PLUGINS = STALE_PLUGINS;
exports.ENGINE_MAP = ENGINE_MAP;
exports.SOCKETS_MAP = SOCKETS_MAP;
