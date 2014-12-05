var cordova = require('cordova');
var prePrepare = require('./pre-prepare');
var postPrepare = require('./post-prepare');
var beforePluginAdd = require('./before-plugin-add');

var cordovaLib = cordova.cordova_lib;

function registerHooks() {
  cordovaLib.events.on('before_prepare', prePrepare);
  cordovaLib.events.on('after_prepare', postPrepare);
  cordovaLib.events.on('before_plugin_add', beforePluginAdd);
}

function unregisterHooks() {
  cordovaLib.events.removeListener('before_prepare', prePrepare);
  cordovaLib.events.removeListener('after_prepare', postPrepare);
  cordovaLib.events.removeListener('before_plugin_add', beforePluginAdd);
}

exports.registerHooks = registerHooks;
exports.unregisterHooks = unregisterHooks;
exports.prePrepare = prePrepare;
exports.postPrepare = postPrepare;
exports.beforePluginAdd = beforePluginAdd;
