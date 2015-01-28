#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var Q = require('Q');
var semver = require('semver');
var cordovalib = require('cordova').cordova_lib;

var TARGET_OWNERS = {
  'agrieve': 1,
  'maxw': 1,
  'mmocny': 1,
  'ian': 1,
  'kamrik': 1
};

function collectPluginInfos(dirs) {
  // Stop plugman from spewing JSON
  console.log = function() {};
  var ret = [];
  dirs.forEach(function(dir) {
    if (!fs.existsSync(path.join(dir, 'plugin.xml'))) {
      console.warn('Skipping: ' + dir + ' (no plugin.xml found)');
      return;
    }
    var pluginInfo = new cordovalib.PluginInfo(dir);
    ret.push(cordovalib.plugman.raw.info([pluginInfo.id])
    .then(function(infoResult) {
      return cordovalib.plugman.raw.owner(['ls', pluginInfo.id])
      .then(function(npmOwners) {
        return {
          pluginInfo: pluginInfo,
          npmInfo: infoResult,
          npmOwners: npmOwners.map(function(o) { return o.name })
        };
      });
    }, function(e) {
      console.warn('Failed to get info for: ' + pluginInfo.id);
      console.warn(e);
      return {
        pluginInfo: pluginInfo,
        npmInfo: null,
        npmOwners: null
      };
    }));
  });
  return Q.all(ret).finally(function() {
    delete console.log;
  });
}

function validatePlugins(pluginInfos) {
  var hadWarning = false;
  pluginInfos.forEach(function(info) {
    var npmInfo = info.npmInfo;
    var pluginInfo = info.pluginInfo;
    info.ownersToRemove = [];
    info.ownersToAdd = [];
    if (npmInfo) {
      var warnings = [];
      if (npmInfo.name != pluginInfo.id) {
        warnings.push('Plugin ID is different on NPM: ' + npmInfo.name);
      }
      var latestVer = npmInfo['dist-tags']['latest'];
      var expectedLocalVer = semver.inc(latestVer, 'patch') + '-dev';
      if (pluginInfo.version != latestVer && pluginInfo.version != expectedLocalVer) {
        warnings.push('Published version is ' + latestVer + ' but local version is ' + pluginInfo.version);
      }
      var expectedAttachment = pluginInfo.id + '-' + latestVer + '.tgz';
      var attachments = npmInfo._attachments;
      if (!attachments[expectedAttachment] || attachments[expectedAttachment].length < 1000) {
        warnings.push('Looks to be missing .tgz!');
      }
      info.npmOwners.forEach(function(owner) {
        if (!TARGET_OWNERS[owner]) {
          warnings.push('Has extra owner "' + owner + '"');
          info.ownersToRemove.push(owner);
        }
      });
      Object.keys(TARGET_OWNERS).forEach(function(owner) {
        if (info.npmOwners.indexOf(owner) == -1) {
          warnings.push('Missing owner "' + owner + '"');
          info.ownersToAdd.push(owner);
        }
      });
      if (warnings.length) {
        warnings.forEach(function(msg) {
          console.warn(pluginInfo.id + ': ' + msg);
        });
        hadWarning = true;
      } else {
        console.log(pluginInfo.id + '@' + latestVer + ': Everything checks out.');
      }
    } else {
      console.log(pluginInfo.id + ': Is not published yet.');
    }
  });
  return Q(hadWarning);
}

function fixPlugins(pluginInfos) {
  var ret = Q();
  pluginInfos.forEach(function(info) {
    var pluginId = info.pluginInfo.id;
    info.ownersToRemove.forEach(function(owner) {
      ret = ret.then(function() {
        console.log('plugman owner rm ' + owner + ' ' + pluginId);
        return cordovalib.plugman.raw.owner(['rm', owner, pluginId]);
      });
    });
    info.ownersToAdd.forEach(function(owner) {
      ret = ret.then(function() {
        console.log('plugman owner add ' + owner + ' ' + pluginId);
        return cordovalib.plugman.raw.owner(['add', owner, pluginId]);
      });
    });
  });
  return ret;
}

function usage() {
  console.log('usage: ' + process.argv[1] + ' [--fix] pluginDir1 pluginDir2 ...');
  process.exit(1);
}

function main() {
  var dirs = [];
  var fix = false;
  process.argv.slice(2).forEach(function(arg) {
    if (/^-/.exec(arg)) {
      if (arg == '--fix') {
        fix = true;
      } else if (arg != '--help') {
        console.error('Unknown flag: ' + arg);
        usage();
      } else {
        usage();
      }
    } else {
      dirs.push(arg);
    }
  });

  if (dirs.length === 0) {
    usage();
  }

  collectPluginInfos(dirs)
  .then(function(pluginInfos) {
    return validatePlugins(pluginInfos)
    .then(function(hadWarning) {
      if (fix) {
        return fixPlugins(pluginInfos);
      } else if (hadWarning) {
        console.log('To fix owner problems, run with --fix');
      }
    });
  }).done();
}

main();
