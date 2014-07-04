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
        url: path.join(ccaRoot, 'cordova', 'cordova-android')
      },
      ios: {
        url: path.join(ccaRoot, 'cordova', 'cordova-ios')
      }
    }
  };
};
