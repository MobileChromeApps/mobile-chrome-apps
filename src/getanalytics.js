var Q = require('q');
var path = require('path');
var fs = require('fs');
var shelljs = require('shelljs');
var utils = require('./utils');

var analyticsModule;

module.exports = getAnalytics;
function getAnalytics(use_logging_mock) {
  if (analyticsModule) {
    return Q(analyticsModule);
  }
  if(use_logging_mock) {
    analyticsModule = makeFakeModule(true);
    return Q(analyticsModule);
  }

  return getAnswer()
  .then(function(ans) {
    analyticsModule = ans ? require('./analytics') : makeFakeModule();
    return Q(analyticsModule);
  });
}

function readWriteUserConfig(userConfig) {
  //var isWrite = !(typeof(ans) == 'undefined');
  var HOME = process.env[(process.platform.slice(0, 3) == 'win') ? 'USERPROFILE' : 'HOME'];
  // Using a file name looked for by "rc" https://github.com/dominictarr/rc
  var userConfigDir = path.join(HOME, '.cca');
  var userConfigPath = path.join(userConfigDir, 'config');
  if (userConfig) { // Write
    shelljs.mkdir('-p', userConfigDir);
    fs.writeFileSync(userConfigPath, JSON.stringify(userConfig, null, 4));
  }
  else if (fs.existsSync(userConfigPath)) {
    userConfig = JSON.parse(fs.readFileSync(userConfigPath, 'utf-8'));
    return userConfig;
  } else {
    return null;
  }
}

function getAnswer() {
  // Load config file and check if we already have an answer there
  var userConfig = readWriteUserConfig();
  if (userConfig && userConfig.analytics) {
    return Q(userConfig.analytics.isAllowed);
  }

  // No saved answer, prompt the user and save his answer.
  return utils.waitForKey('TODO rephrase. Ok to collect usage stats? [y/N] ')
    .then(function(key) {
      var ans = (key.toLowerCase() == 'y');
      // Save answer
      userConfig = userConfig || {};
      userConfig.analytics = userConfig.analytics || {};
      userConfig.analytics.isAllowed = ans;
      userConfig.analytics.savedOnDate = new Date();
      readWriteUserConfig(userConfig);
      return ans;
    });
}

// A stub function to print out all calls to analytics during debugging / testing.
function just_log(x) {
  var now = new Date();
  x.timestamp = now.toISOString();
  console.log(JSON.stringify(x));
}

function makeFakeModule(log_calls) {
  var fakeModule = {};

  // TODO: DEBUG remove 2 lines.
  log_calls = true;
  fakeModule.isFake = true;

  var funcsToFake = ['sendCommand', 'sendError', 'sendTiming'];

  funcsToFake.forEach(function(f) {
    if (log_calls) {
        fakeModule[f] = function() {
        just_log({func:f, args: arguments});
      };
    } else {
      fakeModule[f] = function(){};
    }
  });
  return fakeModule;
}

///// TESTS ////////

// getAnalytics()
// .then(function(analytics){
//   console.log('XXX: Loaded ', analytics);
// })
// .done();

