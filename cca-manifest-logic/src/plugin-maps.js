/*
 * NOTE!
 * If you remove/rename a plugin from these lists, add the old value to the STALE_PLUGINS list at the end.
 * That way, it will be automatically removed on prepare.
 * */


var DEFAULT_PLUGINS = [
    'cordova-plugin-background-app',
    'cordova-plugin-file',
    'cordova-plugin-inappbrowser',
    'cordova-plugin-network-information',
    'cordova-plugin-statusbar',
    'cordova-plugin-whitelist',
    'cordova-plugin-chrome-apps-common',
    'cordova-plugin-chrome-apps-runtime',
    'cordova-plugin-chrome-apps-storage',
    'cordova-plugin-chrome-apps-navigation',
    'cordova-plugin-chrome-apps-bootstrap',
    'cordova-plugin-chrome-apps-i18n',
    'cordova-plugin-customevent-polyfill',
    'cordova-plugin-blob-constructor-polyfill',
    'cordova-plugin-xhr-blob-polyfill',
];

var PLUGIN_MAP = {
  'alarms': ['cordova-plugin-chrome-apps-alarms', 'cordova-plugin-chrome-apps-storage'],
  'audioCapture': ['cordova-plugin-chrome-apps-audiocapture'],
  'background': [],
  'fileSystem': ['cordova-plugin-chrome-apps-filesystem'],
  'fullscreen': [],
  'gcm': ['cordova-plugin-chrome-apps-gcm', 'cordova-plugin-chrome-apps-storage'],
  'geolocation': ['cordova-plugin-geolocation'],
  'identity': ['cordova-plugin-chrome-apps-identity'],
  'idle': ['cordova-plugin-chrome-apps-idle'],
  'notifications': ['cordova-plugin-chrome-apps-notifications', 'cordova-plugin-chrome-apps-storage'],
  'payments': ['cordova-plugin-google-payments'],
  'power': ['cordova-plugin-chrome-apps-power'],
  'pushMessaging': ['cordova-plugin-chrome-apps-pushmessaging', 'cordova-plugin-chrome-apps-identity'],
  'socket': ['cordova-plugin-chrome-apps-socket', 'cordova-plugin-chrome-apps-system-network'],
  'storage': ['cordova-plugin-chrome-apps-storage'],
  'system.cpu': ['cordova-plugin-chrome-apps-system-cpu'],
  'system.display': ['cordova-plugin-chrome-apps-system-display'],
  'system.memory': ['cordova-plugin-chrome-apps-system-memory'],
  'system.network': ['cordova-plugin-chrome-apps-system-network'],
  'system.storage': ['cordova-plugin-chrome-apps-system-storage'],
  'unlimitedStorage': [],
  'videoCapture': ['cordova-plugin-chrome-apps-videocapture'],
  'usbDevices': ['cordova-plugin-chrome-apps-usb'],
  'usb': ['cordova-plugin-chrome-apps-usb'],
};

var STALE_PLUGINS = [
  'com.google.payments',
  'org.apache.cordova.engine.crosswalk',
  'org.chromium.syncfilesystem',
  'org.chromium.alarms',
  'org.chromium.audiocapture',
  'org.chromium.backgroundapp',
  'org.chromium.bluetooth',
  'org.chromium.bluetoothlowenergy',
  'org.chromium.bluetoothsocket',
  'org.chromium.bootstrap',
  'org.chromium.common',
  'org.chromium.filesystem',
  'org.chromium.gcm',
  'org.chromium.i18n',
  'org.chromium.identity',
  'org.chromium.idle',
  'org.chromium.iossocketscommon',
  'org.chromium.navigation',
  'org.chromium.notifications',
  'org.chromium.polyfill.blob_constructor',
  'org.chromium.polyfill.customevent',
  'org.chromium.polyfill.xhr_features',
  'org.chromium.power',
  'org.chromium.pushmessaging',
  'org.chromium.runtime',
  'org.chromium.socket',
  'org.chromium.sockets.tcp',
  'org.chromium.sockets.tcpserver',
  'org.chromium.sockets.udp',
  'org.chromium.storage',
  'org.chromium.system.cpu',
  'org.chromium.system.display',
  'org.chromium.system.memory',
  'org.chromium.system.network',
  'org.chromium.system.storage',
  'org.chromium.usb',
  'org.chromium.videocapture',
  'org.chromium.frameworks.googleopensource',
  'org.chromium.frameworks.googleplus',
  'org.crosswalk.engine'
];

var ENGINE_MAP = {
  'crosswalk': ['cordova-plugin-crosswalk-webview'],
  'system': []
};

var SOCKETS_MAP = {
  'udp': ['cordova-plugin-chrome-apps-sockets-udp'],
  'tcp': ['cordova-plugin-chrome-apps-sockets-tcp'],
  'tcpServer': ['cordova-plugin-chrome-apps-sockets-tcpserver'],
};


exports.DEFAULT_PLUGINS = DEFAULT_PLUGINS;
exports.PLUGIN_MAP = PLUGIN_MAP;
exports.STALE_PLUGINS = STALE_PLUGINS;
exports.ENGINE_MAP = ENGINE_MAP;
exports.SOCKETS_MAP = SOCKETS_MAP;
