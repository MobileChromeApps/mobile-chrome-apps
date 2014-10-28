var cordova = require('cordova');
var prePrepare = require('./pre-prepare');
var postPrepare = require('./post-prepare');

var cordovaLib = cordova.cordova_lib;

function registerHooks() {
  cordovaLib.events.on('before_prepare', prePrepare);
  cordovaLib.events.on('after_prepare', postPrepare);
}

function unregisterHooks() {
  cordovaLib.events.removeListener('before_prepare', prePrepare);
  cordovaLib.events.removeListener('after_prepare', postPrepare);
}

exports.registerHooks = registerHooks;
exports.unregisterHooks = unregisterHooks;
exports.prePrepare = prePrepare;
exports.postPrepare = postPrepare;
