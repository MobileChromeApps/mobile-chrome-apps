var fs = require('fs');
var path = require('path');
var Q = require('q');
var debounce = require('debounce');
var utils = require('./utils');
var child_process = require('child_process');

// Returns a promise.
module.exports = exports = function push(target, watch) {
  var argsAsJson = JSON.stringify([].slice.call(arguments));
  return checkFileHandleLimit()
  .then(function(fileHandleLimit) {
    if (fileHandleLimit < 10000 && watch) {
      return relaunchWithBiggerUlimit(argsAsJson)
      .then(function() {
        return true;
      }, function() {
        // Setting ulimit can fail, so just continue on if it does.
      });
    }
  }).then(function(done) {
    if (done) {
      return;
    }
    target = !target || Array.isArray(target) ? target : [target];
    var ret = Q.when(target);
    if (!target) {
      ret = extractTargets();
    }
    return ret.then(function(targets) {
      return createSession(targets);
    }).then(function(session) {
      // Push the app and force a launch, even if it hasn't changed from a previous launch, since the app is being pushed for the first time.
      return pushAll(session.clientInfos, /* forceLaunch */ true)
      .then(function() {
        if (watch) {
          return watchFiles(session);
        }
      });
    });
  });
};

function extractTargets() {
  // TODO: Use adbkit for smarter auto-detection.
  var PushClient = require('chrome-app-developer-tool-client');
  return PushClient.detectAdbTargets()
  .then(function(targets) {
      if (!targets.length) {
          console.warn('No connected android devices detected. Defaulting to localhost.');
          targets = ['localhost:2424'];
      }
      return targets;
  }, function() {
      console.warn('Could not use adb to detect connected devices');
      return ['localhost:2424'];
  });
}

function createSession(targets) {
  var PushClient = require('chrome-app-developer-tool-client');

  var i = 0;
  var ret = {
    platforms: [],
    clientInfos: [],
    appType: null
  };

  var chromeAppPushRoot = null;
  if (fs.existsSync('www/manifest.json')) {
    chromeAppPushRoot = 'www';
  } else if (fs.existsSync('manifest.json')) {
    chromeAppPushRoot = '.';
  }
  ret.appType = chromeAppPushRoot ? 'chrome' : 'cordova';

  var platformMap = Object.create(null);
  function createClient() {
    var target = targets[i++];
    if (!target) {
      ret.platforms = Object.keys(platformMap);
      return ret;
    }
    var newClient = new PushClient(target);
    return newClient.info()
    .then(function(response) {
      var infoJson = response.body;
      var platform = infoJson['platform'];
      platformMap[platform] = true;
      if (ret.appType == 'chrome') {
        ret.clientInfos.push({
            platform: platform,
            client: newClient,
            pushSession: newClient.createPushSession(chromeAppPushRoot),
            watchDir: chromeAppPushRoot
        });
      } else {
        // Vanilla Cordova project.
        var wwwDir = utils.assetDirForPlatform(platform);
        ret.clientInfos.push({
            platform: platform,
            client: newClient,
            pushSession: newClient.createPushSession('.'), // push client figures out to use platforms/
            watchDir: wwwDir
        });
      }
      return createClient();
    }, function(error) {
      if (error.code === 'ECONNREFUSED') {
        console.warn();
        console.warn('Could not connect to device at ' + target);
        console.warn('For a USB connected Android device, try running: adb forward tcp:2424 tcp:2424');
        console.warn('For a networked device, use --target=DEVICE_IP_ADDRESS');
      } else if (error.code === 'ECONNRESET') {
        console.warn('\nPlease make sure that the Chrome App Developer Tool for Mobile is running on your device.');
      } else {
        console.error(error);
      }
      process.exit();
    });
  }
  return createClient();
}

var pushInProgress = false;
var pushAgainWhenDone = false;
// gaze uses fs.watchFile, which is classified as "unstable" (http://goo.gl/H16j5l).
// It sometimes causes multiple change events to be fired, and they're far enough apart that debouncing is ineffective.
// To deal with this, CADT-client's push functionality doesn't relaunch an app with no changes unless `forceLaunch` is true.
// Calls to `pushAll` can specify whether to force a launch.
function pushAll(clientInfos, forceLaunch) {
  if (pushInProgress) {
    pushAgainWhenDone = true;
    return Q();
  }
  pushInProgress = true;
  var allPromises = clientInfos.map(function(clientInfo) {
    try {
      return clientInfo.pushSession.push(forceLaunch);
    } catch (e) {
      if (/Not a Cordova project/.test(e)) {
        console.warn('Please navigate to a Chrome App or Cordova project, and then try pushing again.');
      } else {
        console.error(e);
      }
      process.exit();
    }
  });
  return Q.all(allPromises)
  .then(function() {
    if (pushAgainWhenDone) {
      process.nextTick(function() {
        // Push, but don't force a launch if the app hasn't changed.
        pushAll(clientInfos, /* forceLaunch */ false).done();
      });
    }
    pushInProgress = false;
    pushAgainWhenDone = false;
  }, function(e) {
    pushInProgress = false;
    pushAgainWhenDone = false;
    throw e;
  });
}

var debouncedPushAll = debounce(function(clientInfos) {
  // Push, but don't force a launch if the app hasn't changed.
  pushAll(clientInfos, /* forceLaunch */ false).done();
}, 50, false);

function watchFiles(session) {
  var gaze = require('gaze');
  var deferred = Q.defer();

  // TODO: This doesn't work for vanilla cordova apps + multiple platforms.
  var watchDir = session.clientInfos[0].watchDir;
  // Note: gaze doesn't work well with ./ prefix nor with absolute paths
  // (https://github.com/gruntjs/grunt-contrib-watch/issues/166)
  // path.join() is smart enough to remove the ./ prefix.
  gaze(path.join(watchDir, '**', '*'), function(err, watcher) {
    console.log('Watching for changes.');
    watcher.on('all', function(event, filepath) {
      debouncedPushAll(session.clientInfos);
    });
  });
  // TODO: Capture Ctrl-C and resolve the promise.
  return deferred.promise;
}

function checkFileHandleLimit() {
  var deferred = Q.defer();
  if (process.platform != 'win32' && process.env['SHELL']) {
    // gaze opens a lot of file handles, and the default on OS X is too small (EMFILE exceptions).
    // NOTE: This is fixed in node 0.11, and is a problem only on node 0.10.
    child_process.exec('ulimit -n', function(error, stdout, stderr) {
      var curLimit = !error && +stdout;
      deferred.resolve(curLimit || Infinity);
    });
  } else {
    deferred.resolve(Infinity);
  }
  return deferred.promise;
}

function relaunchWithBiggerUlimit(argsAsJson) {
  // re-run with the new ulimit
  var deferred = Q.defer();
  var args = ['-c', 'ulimit -n 10240 && exec "' + process.argv[0] + '" "' + __filename + '" "' + argsAsJson.replace(/"/g, '@') + '"'];
  var child = child_process.spawn(process.env['SHELL'], args, { stdio: 'inherit' });
  child.on('close', function(code) {
    if (code) {
      deferred.reject(code);
    } else {
      deferred.resolve(code);
    }
  });
  return deferred.promise;
}

// Gets called from EMFILE re-launch
if (require.main === module) {
  exports.apply(this, JSON.parse(process.argv[2].replace(/@/g, '"'))).done();
}
