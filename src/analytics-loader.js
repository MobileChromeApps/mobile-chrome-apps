var Q = require('q');
var path = require('path');
var fs = require('fs');
var shelljs = require('shelljs');
var utils = require('./utils');

var analyticsModule;

// This function retrieves either the analytics module or a mocked version that provides no-ops.
// If the argument is true, the mocked version will log all calls.
function getAnalyticsModule(useTestingVersion) {
  if (useTestingVersion) {
    analyticsModule = makeFakeModule(true /* logCalls */);
    return Q(analyticsModule);
  }

  // If we've already loaded an analytics module, use the one we already have.
  if (analyticsModule) {
    return Q(analyticsModule);
  }

  // Ask for permission and return a module accordingly.
  return requestPermission()
  .then(function(permission) {
    analyticsModule = permission ? require('./analytics') : makeFakeModule(false /* logCalls */);
    return Q(analyticsModule);
  });
}

// This function returns a fake analytics module.
// If the argument is true, the fake module will log all calls.
function makeFakeModule(logCalls) {
  var fakeModule = { };

  // These "functions to fake" should be updated whenever a function is added to the real analytics module.
  var funcsToFake = ['sendEvent'];

  // Fake our functions, logging if required.
  funcsToFake.forEach(function(f) {
    if (logCalls) {
      fakeModule[f] = function() {
        log({ func: f, args: arguments });
      };
    } else {
      fakeModule[f] = function() { };
    }
  });

  return fakeModule;
}

// This function determines whether the developer approves of the collection of usage statistics.
// If permission has previously been ascertained, we read it from a file.  Otherwise, we the user now.
// It returns a promise that contains the answer.
function requestPermission() {
  // Load the config file and check if permission has already been granted or denied.
  var userConfig = readWriteUserConfig();
  if (userConfig && userConfig.analytics) {
    return Q(userConfig.analytics.isAllowed);
  }

  // We have no record of permission, so ask away.
  var promptText = 'Would you like to help make make this tool better by automatically sending usage statistics and error reports to Google?\n';
  promptText += 'This information will be used in accordance with the Google Privacy Policy (http://www.google.com/policies/privacy). [y/n] ';
  return utils.waitForKey(promptText)
  .then(function(key) {
    var permission = (key.toLowerCase() == 'y');

    // Write the response to the config file and return it.
    writePermission(permission);
    return permission;
  });
}

// This function writes the given permission to the config file.
function writePermission(permission) {
  var userConfig = readWriteUserConfig();
  userConfig = userConfig || {};
  userConfig.analytics = userConfig.analytics || {};
  userConfig.analytics.isAllowed = permission;
  userConfig.analytics.savedOnDate = new Date();
  readWriteUserConfig(userConfig);
}

// This function either reads or writes the config file.
// If the argument is empty, this function reads the returns the config file.
// If the argument is not empty, its contents are written to the config file.
function readWriteUserConfig(userConfig) {
  // Determine the path of the config file.
  // We use this format to comply with the `rc` config loader (https://github.com/dominictarr/rc), in case we use that in the future.
  var HOME = process.env[(process.platform.slice(0, 3) == 'win') ? 'USERPROFILE' : 'HOME'];
  var userConfigDir = path.join(HOME, '.cca');
  var userConfigPath = path.join(userConfigDir, 'config');

  // Write to the file if we were passed an argument, or read and return it if we were.
  // If we were instructed to read the file, but it doesn't exist, return null.
  if (userConfig) {
    shelljs.mkdir('-p', userConfigDir);
    fs.writeFileSync(userConfigPath, JSON.stringify(userConfig, null, 4));
  } else if (fs.existsSync(userConfigPath)) {
    userConfig = JSON.parse(fs.readFileSync(userConfigPath, 'utf-8'));
    return userConfig;
  } else {
    return null;
  }
}

// This function handles calls to `cca analytics`.
function analyticsCommand(command) {
  var usage = '`cca analytics [enable|disable]`';

  // `cca analytics` will tell the user whether analytics are enabled or disabled.
  if (!command) {
    var userConfig = readWriteUserConfig();
    var permission = userConfig && userConfig.analytics && userConfig.analytics.isAllowed;
    var outputText = 'Usage statistics collection is currently ' + (permission ? 'enabled' : 'disabled') + '. ';
    outputText += 'To change this, run ' + usage + '.';
    console.log(outputText);
    return;
  }

  // We only allow `enable` and `disable`; print an error if we were given something else.
  command = command.toLowerCase();
  if (command != 'enable' && command != 'disable') {
    var errorText = 'Invalid argument: ' + command + '. ';
    errorText += 'To enable or disable usage statistics collection, run ' + usage + '.';
    utils.fatal(errorText);
    return;
  }

  // Set analytics permission according to the given command.
  writePermission(command == 'enable');
  console.log('Usage statistics collection ' + command + 'd.');
}

// This function prints the given object, along with a timestamp.
function log(x) {
  var now = new Date();
  x.timestamp = now.toISOString();
  console.log(JSON.stringify(x));
}

// Exports!
module.exports = {
  analyticsCommand: analyticsCommand,
  getAnalyticsModule: getAnalyticsModule,
  readWriteUserConfig: readWriteUserConfig
};

