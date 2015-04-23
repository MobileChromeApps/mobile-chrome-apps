var fs = require('fs');
var Q = require('q');
var path = require('path');
var shelljs = require('shelljs');
var __ = require('underscore');
var utils = require('./utils');
var cordova = require('cordova');
var hooks = require('./hooks');

// Exports
exports.upgradeProject = upgradeProject;
exports.upgradeProjectIfStale = upgradeProjectIfStale;

// The list of platforms we currently have installed
function getInstalledPlatfroms() {
  return ['ios', 'android'].filter(function(p){
    return fs.existsSync(path.join('platforms', p));
  });
}

// Get the list of supported platforms. Returns a promise.
function getSupportedPlatforms() {
  var plats = [];
  return require('./tools-check')()
  .then(function(toolsCheckResults) {
    if (toolsCheckResults.hasAndroidPlatform) {
      plats.push('android');
    }
    if (toolsCheckResults.hasXcode ) {
      plats.push('ios');
    }
    return plats;
  });
}

// Get the list of all plugins managed by CCA
function getCcaPlugins() {
  var pluginMaps = require('cca-manifest-logic').pluginMaps;
  // The list of plugins is constructed from all plugin IDs in:
  // pluginMaps.DEFAULT_PLUGINS (Array)
  // pluginMaps.*_MAP (objects)
  var ccaPlugins = __.map(pluginMaps, function(val, key) {
    return /_MAP/.test(key) ? __.values(val) : [];
  });
  ccaPlugins.push(pluginMaps.DEFAULT_PLUGINS);
  ccaPlugins = __.uniq(__.flatten(ccaPlugins));

  return ccaPlugins;
}


// This function is run on almost any cca invocation
// It will run "upgrade" if either:
//  1. The project has not platforms installed
//  2. The file ./platforms/created-with-cca-version contains older version string
//  3. The file ./platforms/created-with-cca-version does not exist
function upgradeProjectIfStale(skipPrompt) {
  var packageVersion = require('../package').version;
  var installedPlatfroms = getInstalledPlatfroms();

  if (!installedPlatfroms.length) {
    // No platforms installed yet, (ab)use upgradeProject(skipPrompt=true) to install both.
    // Ideally we would do this in pre-prepare, but cordova doesn't run pre-prepare scripts if there
    // are no target platforms, and its unclear how to make it do so with a difference concept
    // for pre-prepare scripts.
    return exports.upgradeProject(true);
  } else {

    var versionFile = path.join('platforms', 'created-with-cca-version');
    var createdWith;
    if (fs.existsSync(versionFile)) {
      createdWith = fs.readFileSync(versionFile, 'utf-8').trim();
    }
    if (createdWith == packageVersion) {
      return Q();
    } else {
      // The platforms/created-with-cca-version file does not exist or contains older version string. Upgrading.
      console.log('This project was not upgraded to cca v' + packageVersion + ' yet.  Attempting to upgrade now...');
      return exports.upgradeProject(skipPrompt);
    }
  }
}


function upgradeProject(skipPrompt) {
  var argv = require('optimist')
      .options('link', { type: 'boolean' })
      .options('verbose', { type: 'boolean', alias: 'd' })
      .argv;
  var hadPlatforms = [];

  return Q()
  .then(function(){
    if (skipPrompt) return 'y';
    return utils.waitForKey('Warning: Upgrade will replace all files in platforms and plugins. Continue? [y/N] ');
  })
  .then(function(key) {
    if (key != 'y' && key != 'Y') {
      return Q.reject('Okay, nevermind.');
    }
  })
  .then(function() {
    // Upgrading!

    // We don't want the pre/post prepare hooks to fire during upgrade.
    hooks.unregisterHooks();

    // Remove the old file based pre/post prepare hooks
    // TODO: Remove this later. Last version to use file based hooks was 4.0.0 released in Oct 2014.
    shelljs.rm('-f', path.join('hooks', 'before_prepare', 'cca-pre-prepare.js'));
    shelljs.rm('-f', path.join('hooks', 'after_prepare', 'cca-post-prepare.js'));

    // Remember what platforms we had before deleting them. If we only had one, don't install the other after upgrade.
    hadPlatforms = getInstalledPlatfroms();
    shelljs.rm('-rf', 'platforms');

    shelljs.rm('-f', path.join('plugins', 'android.json'));
    shelljs.rm('-f', path.join('plugins', 'ios.json'));

    var installedPlugins = cordova.cordova_lib.PluginInfo.loadPluginsDir('plugins');
    installedPlugins = __.pluck(installedPlugins, 'id');

    // Only remove the CCA managed plugins
    var allCcaPlugins = getCcaPlugins();
    var pluginsToRemove = __.intersection(allCcaPlugins, installedPlugins);
    if (pluginsToRemove && pluginsToRemove.length) {
      return require('./cordova-commands').runCmd(['plugin', 'rm', pluginsToRemove]);
    }
  })
  .then(function() {
    console.log('## First-time build. Detecting available SDKs:');
    return getSupportedPlatforms();
  })
  .then(function(plats) {
    if (plats.length) {
      // If this is a real upgrade, only install the platforms we had before.
      if (hadPlatforms.length) {
        plats = __.intersection(plats, hadPlatforms);
      }
      var opts = {
        link: argv.link,
        verbose: argv.verbose
      };
      return require('./cordova-commands').runCmd(['platform', 'add', plats, opts]);
    }
  })
  .then(function() {
    // Turn the hooks back on and fire prepare. The pre-prepare hook is what
    // installs all the cca plugins back.
    hooks.registerHooks();
    return cordova.raw.prepare();
  })
  .then(require('./write-out-cca-version'));
}
