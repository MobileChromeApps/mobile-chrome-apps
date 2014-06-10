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
    return createClients(targets)
  }).then(function(clients) {
    return pushAll(clients)
    .then(function() {
      return watch && watchFiles(clients);
    });
  });
};

function extractTargets() {
  // TODO: Use adbkit for smarter auto-detection.
  return Q.when(['localhost:2424']);
}

function createClients(targets) {
  var PushClient = require('chrome-harness-client');

  var deferred = Q.defer();
  var i = 0;
  var clients = [];
  function createClient() {
    var target = targets[i++];
    if (!target) {
      return clients;
    }
    var newClient = new PushClient(target);
    return newClient.info()
    .then(function(response) {
      var infoJson = response.body;
      var wwwDir = utils.assetDirForPlatform(infoJson['platform']);
      // If the platform is added, then treat it as a cordova project.
      // Otherwise, treat it as a Chrome App.
      var pushRoot = fs.existsSync(wwwDir) ? process.cwd() : path.join(process.cwd(), 'www');
      // TODO: Do what the comment says. We need to add in prepare to --watch though, so for
      // now always watch the top-level www.
      pushRoot = path.join(process.cwd(), 'www');
      clients.push({
          platform: infoJson['platform'],
          client: newClient,
          pushSession: newClient.createPushSession(pushRoot),
          rootDir: pushRoot
      });
      return createClient();
    });
  }
  return createClient();
}

var pushInProgress = false;
var pushAgainWhenDone = false;
function pushAll(clients) {
  if (pushInProgress) {
    pushAgainWhenDone = true;
    return;
  }
  pushInProgress = true;
  var allPromises = clients.map(function(client) {
    return client.pushSession.push();
  });
  var pushAgain = false;
  return Q.all(allPromises)
  .then(function() {
    if (pushAgainWhenDone) {
      return process.nextTick(function() {
        pushAll(clients).done();
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

var debouncedPushAll = debounce(function(clients) {
  pushAll(clients).done();
}, 50, false);

function watchFiles(clients) {
  var gaze = require('gaze');
  var deferred = Q.defer();

  // Watch all .js files/dirs in process.cwd()
  gaze(clients[0].rootDir + '/**/*', function(err, watcher) {
    console.log('Watching for changes.');
    watcher.on('all', function(event, filepath) {
      debouncedPushAll(clients);
    });
  });
  // TODO: Capture Ctrl-C and resolve the promise.
  return deferred.promise;
}

