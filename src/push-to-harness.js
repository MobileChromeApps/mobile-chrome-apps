var fs = require('fs');
var path = require('path');
var Q = require('q');
var debounce = require('debounce');
var utils = require('./utils');

// Returns a promise.
module.exports = exports = function push(target, watch) {
  target = !target || Array.isArray(target) ? target : [target];
  var ret = Q.when(target);
  if (!target) {
    ret = extractTargets()
  }
  return ret.then(function(targets) {
    return createSession(targets)
  }).then(function(session) {
    return pushAll(session.clientInfos)
    .then(function() {
      return watch && watchFiles(session);
    });
  });
};

function extractTargets() {
  // TODO: Use adbkit for smarter auto-detection.
  return Q.when(['localhost:2424']);
}

function createSession(targets) {
  var PushClient = require('chrome-harness-client');

  var deferred = Q.defer();
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
    });
  }
  return createClient();
}

var pushInProgress = false;
var pushAgainWhenDone = false;
function pushAll(clientInfos) {
  if (pushInProgress) {
    pushAgainWhenDone = true;
    return Q();
  }
  pushInProgress = true;
  var allPromises = clientInfos.map(function(clientInfo) {
    return clientInfo.pushSession.push();
  });
  var pushAgain = false;
  return Q.all(allPromises)
  .then(function() {
    if (pushAgainWhenDone) {
      return process.nextTick(function() {
        pushAll(clientInfos).done();
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
  pushAll(clientInfos).done();
}, 50, false);

function watchFiles(session) {
  var gaze = require('gaze');
  var deferred = Q.defer();

  // TODO: This doesn't work for vanilla cordova apps + multiple platforms.
  gaze(session.clientInfos[0].watchDir + '/**/*', function(err, watcher) {
    console.log('Watching for changes.');
    watcher.on('all', function(event, filepath) {
      debouncedPushAll(session.clientInfos);
    });
  });
  // TODO: Capture Ctrl-C and resolve the promise.
  return deferred.promise;
}

