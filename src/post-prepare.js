// System modules.
var fs = require('fs');
var path = require('path');

// Third-party modules.
var et = require('elementtree');
var shelljs = require('shelljs');
var Q = require('q');

var utils = require('./utils');
var cordova = require('cordova');
var cordovaLib = cordova.cordova_lib;


// Returns a promise.
module.exports = exports = function postPrepareCommand(opts) {
  var hasAndroid = fs.existsSync(path.join('platforms', 'android'));
  var hasIos = fs.existsSync(path.join('platforms', 'ios'));

  if (!fs.existsSync('platforms')) {
    return Q.reject('No platforms directory found. Please run script from the root of your project.');
  }

  var p = Q();
  if (hasAndroid) {
    p = p.then(function() { return postPrepareInternal('android'); });
  }
  if (hasIos) {
    p = p.then(function() { return postPrepareInternal('ios'); });
  }
  return p;
};

// Internal function called potentially multiple times to cover all platforms.
function postPrepareInternal(platform) {
  var root = utils.assetDirForPlatform(platform);

  /* Android asset packager ignores, by default, directories beginning with
     underscores. This can be fixed with an update to the project.properties
     file, but only when compiling with ant. There is a bug outstanding to
     fix this behaviour in Eclipse/ADT as well.

     References:
       https://code.google.com/p/android/issues/detail?id=5343
       https://code.google.com/p/android/issues/detail?id=41237
   */
  var badPath = path.join(utils.assetDirForPlatform(platform), '_locales');
  var betterPath = path.join(utils.assetDirForPlatform(platform), 'CCA_locales');
  var promise = Q();
  if (fs.existsSync(badPath)) {
    console.log('## Pre-processing _locales for ' + platform);
    fs.renameSync(badPath, betterPath);
    promise = Q.ninvoke(fs, 'readdir', betterPath)
    .then(function(files) {
      for (var i=0; i<files.length; i++) {
        var fullName = path.join(betterPath, files[i]);
        var adjustedFilename= files[i].replace('-', '_').toLowerCase();
        if (files[i] !== adjustedFilename) {
          var stats = fs.statSync(fullName);
          if (stats.isDirectory()) {
            fs.renameSync(fullName, path.join(betterPath, adjustedFilename));
          }
        }
      }
    });
  }

  return promise.then(function() {
    return require('./get-manifest')('www', platform);
  }).then(function(manifest) {
    if (!manifest || !manifest.icons) return;
    var iconMap = {};
    var iPhoneFiles = {
        'icon-40': true,
        'icon-small': true,
        'icon.png': true,
        'icon@2x': true,
        'icon-72': true,
        'icon-72@2x': true
    };
    var iPadFiles = {
        'icon-small': true,
        'icon-40': true,
        'icon-50': true,
        'icon-76': true,
        'icon': true,
        'icon@2x': true,
        'icon-72': true,
        'icon-72@2x': true
    };
    var infoPlistXml = null;
    var infoPlistPath = null;
    var iosIconDir = null;

    if (platform === "android") {
      iconMap = {
        "36": [path.join('res','drawable-ldpi','icon.png')],
        "48": [path.join('res','drawable-mdpi','icon.png')],
        "72": [path.join('res','drawable-hdpi','icon.png')],
        "96": [path.join('res','drawable-xhdpi','icon.png')],
        "144": [path.join('res','drawable-xxhdpi','icon.png')],
        "192": [path.join('res','drawable-xxxhdpi','icon.png')]
      };
    } else if (platform === "ios") {
      var platforms = cordovaLib.cordova_platforms;
      var parser = new platforms.ios.parser(path.join('platforms','ios'));
      iconMap = {
        "-1": [path.join(parser.originalName, 'Resources','icons','icon-60.png')], // this file exists in the template but isn't used.
        "29": [path.join(parser.originalName, 'Resources','icons','icon-small.png')],
        "40": [path.join(parser.originalName, 'Resources','icons','icon-40.png')],
        "50": [path.join(parser.originalName, 'Resources','icons','icon-50.png')],
        "57": [path.join(parser.originalName, 'Resources','icons','icon.png')],
        "58": [path.join(parser.originalName, 'Resources','icons','icon-small@2x.png')],
        "72": [path.join(parser.originalName, 'Resources','icons','icon-72.png')],
        "76": [path.join(parser.originalName, 'Resources','icons','icon-76.png')],
        "80": [path.join(parser.originalName, 'Resources','icons','icon-40@2x.png')],
        "100": [path.join(parser.originalName, 'Resources','icons','icon-50@2x.png')],
        "114": [path.join(parser.originalName, 'Resources','icons','icon@2x.png')],
        "120": [path.join(parser.originalName, 'Resources','icons','icon-60@2x.png')],
        "144": [path.join(parser.originalName, 'Resources','icons','icon-72@2x.png')],
        "152": [path.join(parser.originalName, 'Resources','icons','icon-76@2x.png')]
      };
      infoPlistPath = path.join('platforms', 'ios', parser.originalName, parser.originalName + '-Info.plist');
      infoPlistXml = et.parse(fs.readFileSync(infoPlistPath, 'utf-8'));
      iosIconDir = path.join(parser.originalName, 'Resources', 'icons');
    }
    function copyIcon(size, dstPath) {
      shelljs.mkdir('-p', path.dirname(dstPath));
      shelljs.cp('-f', path.join('www', utils.fixPathSlashes(manifest.icons[size])), dstPath);
      if (shelljs.error()) {
        console.log("Error copying " + size + "px icon file: " + shelljs.error());
      }
    }
    var missingIcons = [];
    var dstPath;
    if (iconMap) {
      //console.log('## Copying icons for ' + platform);
      for (var size in iconMap) {
        for (var i=0; i < iconMap[size].length; i++) {
          dstPath = path.join('platforms', platform, iconMap[size][i]);
          if (manifest.icons[size]) {
            //console.log("Copying " + size + "px icon file");
            copyIcon(size, dstPath);
          } else {
            missingIcons.push(dstPath);
          }
        }
      }
      // Find the largest icon.
      var bestSize = '0';
      for (size in manifest.icons) {
        bestSize = +size > +bestSize ? size : bestSize;
      }
      missingIcons.forEach(function(dstPath) {
        var imgName = path.basename(dstPath).replace(/\..*?$/, '');
        // Leave at least one icon.
        if (imgName != 'icon') {
          delete iPadFiles[imgName];
          delete iPhoneFiles[imgName];
        }
        // TODO: need to remove the iOS assets from the Xcode project file (ugh).
        if (platform == 'android') {
          shelljs.rm('-f', dstPath);
        } else if (platform == 'ios') {
          // Fill in all missing iOS icons with the largest resolution we have.
          copyIcon(bestSize, dstPath);
        }
      });
      // Use the largest icon as the default Android one.
      if (platform == 'android') {
        dstPath = path.join('platforms', platform, 'res', 'drawable', 'icon.png');
        copyIcon(bestSize, dstPath);
      }
      if (infoPlistXml) {
        var findArrayNode = function(key) {
          var foundNode = null;
          var foundKey = 0;
          infoPlistXml.iter('*', function(e) {
            if (foundKey === 0) {
              if (e.text == key) {
                foundKey = 1;
              }
            } else if (foundKey == 1) {
              if (e.text == 'CFBundleIconFiles') {
                foundKey = 2;
              }
            } else if (foundKey == 2) {
              if (e.tag == 'array') {
                foundNode = e;
                foundKey = 3;
              }
            }
          });
          return foundNode;
        };
        var setValues = function(key, vals) {
          var node = findArrayNode(key);
          node.clear();
          for (var imgName in vals) {
            et.SubElement(node, 'string').text = imgName;
          }
        };
        setValues('CFBundleIcons', iPhoneFiles);
        setValues('CFBundleIcons~ipad', iPadFiles);
        fs.writeFileSync(infoPlistPath, et.tostring(infoPlistXml.getroot(), {indent: 8}), 'utf8');
      }
    }
  })

  // Update Android Theme to Translucent
  .then(function() {
    if (platform === 'android') {
      var androidManifestPath = path.join('platforms', 'android', 'AndroidManifest.xml');
      var androidManifest = et.parse(fs.readFileSync(androidManifestPath, 'utf-8'));
      androidManifest.find('./application/activity').attrib["android:theme"] = "@android:style/Theme.Translucent";
      fs.writeFileSync(androidManifestPath, androidManifest.write({indent: 4}), 'utf-8');
    }
  })

  // Update Android minSdkVersion.
  .then(function() {
    if (platform === 'android') {
      var iceCreamSandwichVersion = '14';
      var androidManifestPath = path.join('platforms', 'android', 'AndroidManifest.xml');
      var androidManifest = et.parse(fs.readFileSync(androidManifestPath, 'utf-8'));
      androidManifest.find('./uses-sdk/').attrib["android:minSdkVersion"] = iceCreamSandwichVersion;
      fs.writeFileSync(androidManifestPath, androidManifest.write({indent: 4}), 'utf-8');
    }
  })

  // Merge the manifests.
  .then(function() {
    return require('./get-manifest')('www', platform);
  }).then(function(manifest) {
    return Q.ninvoke(fs, 'writeFile', path.join(root, 'manifest.json'), JSON.stringify(manifest));
  })
  // Write manifest.short_name as launcher_name in Android strings.xml
  .then(function() {
    return require('./get-manifest')('www', platform);
  }).then(function(manifest) {
    // Android
    if (platform === 'android' && manifest) {
      if (manifest.short_name) {
        var stringsPath = path.join('platforms', 'android', 'res', 'values', 'strings.xml');
        var strings = et.parse(fs.readFileSync(stringsPath, 'utf-8'));
        strings.find('./string/[@name="launcher_name"]').text = manifest.short_name;
        fs.writeFileSync(stringsPath, strings.write({indent: 4}), 'utf-8');
      }
    }
  });
}
