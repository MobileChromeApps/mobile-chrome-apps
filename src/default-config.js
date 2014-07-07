var path = require('path');

module.exports = exports = function defaultConfig(ccaRoot) {
  return {
    plugin_search_path: [
        path.join(ccaRoot, 'cordova'),
        path.join(ccaRoot, 'cordova', 'cordova-plugins'),
        path.join(ccaRoot, 'chrome-cordova', 'plugins'),
        ],
    lib: {
      android: {
        // TODO: Remove uri here and below after cordova-lib@0.21.7 is released.
        uri: path.join(ccaRoot, 'cordova', 'cordova-android'),
        url: path.join(ccaRoot, 'cordova', 'cordova-android')
      },
      ios: {
        uri: path.join(ccaRoot, 'cordova', 'cordova-ios'),
        url: path.join(ccaRoot, 'cordova', 'cordova-ios')
      }
    }
  };
};
