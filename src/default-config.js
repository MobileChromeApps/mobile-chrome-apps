var path = require('path');
var fs = require('fs');

module.exports = exports = function defaultConfig(ccaRoot) {

  var plugin_search_path = [
    path.join(ccaRoot, 'cordova'),
  ];

  // For plugin development with local cca git checkout.
  var chrome_cordova_plugins = path.join(ccaRoot, '..', 'mobile-chrome-apps-plugins');
  if (fs.existsSync(chrome_cordova_plugins)) {
    plugin_search_path.push(chrome_cordova_plugins);
  }

  return {
    plugin_search_path: plugin_search_path,
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
