// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var argscheck = cordova.require('cordova/argscheck');
var Event = require('org.chromium.common.events');
var stubs = require('org.chromium.common.stubs');

var manifestJson;

exports.onSuspend = new Event('onSuspend');
exports.onInstalled = new Event('onInstalled');
exports.onStartup = new Event('onStartup');
exports.onSuspendCanceled = new Event('onSuspendCanceled');
exports.onUpdateAvailable = new Event('onUpdateAvailable');
//exports.onBrowserUpdateAvailable = new Event('onBrowserUpdateAvailable');
//exports.onConnect = new Event('onConnect');
//exports.onConnectExternal = new Event('onConnectExternal');
//exports.onMessage = new Event('onMessage');
//exports.onMessageExternal = new Event('onMessageExternal');


// Uses a trampoline to bind the Cordova pause event on the first call.
var original_onSuspend_addListener = exports.onSuspend.addListener;
exports.onSuspend.addListener = function(f) {
  window.document.addEventListener('pause', function() {
    retval = exports.onSuspend.fire.apply(exports.onSuspend, arguments);
    chrome.storage.internal.set({"shutdownClean":true});
    return retval;
  }, false);
  exports.onSuspend.addListener = original_onSuspend_addListener;
  exports.onSuspend.addListener(f);
};

// Uses a trampoline to bind the Cordova resume event on the first call.
var original_onSuspendCanceled_addListener = exports.onSuspendCanceled.addListener;
exports.onSuspendCanceled.addListener = function(f) {
  window.document.addEventListener('resume', function() {
    chrome.storage.internal.remove("shutdownClean");
    return exports.onSuspendCanceled.fire.apply(exports.onSuspendCanceled, arguments);
  }, false);
  exports.onSuspendCanceled.addListener = original_onSuspendCanceled_addListener;
  exports.onSuspendCanceled.addListener(f);
};

exports.getManifest = function() {
  if (typeof manifestJson == 'undefined') {
    var xhr = new XMLHttpRequest();
    // This is a bit fragile - determine path by whether chromeapp.html is in the URL.
    var path = /chromeapp\.html$/.exec(location.href) ? '../../manifest.json' : 'manifest.json';
    xhr.open('GET', path, false);
    xhr.send(null);
    if (xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) {
      // Don't use JSON.parse, since it fails on comments.
      manifestJson = eval('(' + xhr.responseText + ')');
    } else {
      manifestJson = null;
    }
  }
  return manifestJson;
};

// This is an extension for vanilla cordova apps
exports.setManifest = function(manifest) {
  manifestJson = manifest;
  cachedAppId = null;
}

exports.getBackgroundPage = function(callback) {
  try {
    var mobile = require('org.chromium.bootstrap.mobile.impl');
  } catch(e) {}
  argscheck.checkArgs('f', 'chrome.runtime.getBackgroundPage', arguments);
  setTimeout(function() {
    callback(typeof mobile !== 'undefined' ? mobile.bgWindow : undefined);
  }, 0);
};

// Returns a URL relative to the root of the project.
exports.getURL = function(subResource) {
  argscheck.checkArgs('s', 'chrome.runtime.getURL', arguments);
  if (subResource.charAt(0) == '/') {
    subResource = subResource.slice(1);
  }
  return 'chrome-extension://' + getAppId() + '/' + subResource;
};

var origLocation = location.href;
exports.reload = function() {
  history.replaceState(null, null, origLocation);
  location.reload();
};

function getCrypto() {
  var ret = require('./CryptoJS-sha256');
  require('./CryptoJS-enc-base64-min'); // just need to make sure this runs
  return ret;
}

function hexToMPDecimal(hex) {
  var hexToMPDecimalLookupTable = {
    0:'a', 1:'b', 2:'c', 3:'d',
    4:'e', 5:'f', 6:'g', 7:'h',
    8:'i', 9:'j', a:'k', b:'l',
    c:'m', d:'n', e:'o', f:'p',
  };
  return Array.prototype.map.call(hex, function(c) { return hexToMPDecimalLookupTable[c]; }).join('');
}

function mapAppNameToAppId (name) {
  var CryptoJS = getCrypto();
  var idInHex = CryptoJS.SHA256(name).toString(CryptoJS.enc.Hex).slice(0,32).toLowerCase();
  var idInMPDecimal = hexToMPDecimal(idInHex);
  return idInMPDecimal;
}

function mapAppKeyToAppId(key) {
  var CryptoJS = getCrypto();
  // See http://stackoverflow.com/questions/1882981/google-chrome-alphanumeric-hashes-to-identify-extensions/2050916#2050916
  return mapAppNameToAppId(CryptoJS.enc.Base64.parse(key))
}

var cachedAppId = null;
function getAppId() {
  if (!cachedAppId) {
    var manifest = exports.getManifest();
    if (manifest) {
      var key = manifest['key'];
      if (typeof key === 'undefined') {
        // For development, we want a consistent ID even without a public key.  Chrome uses the app path instead of name.
        cachedAppId = mapAppNameToAppId(manifest['name']);
      } else {
        try {
          cachedAppId = mapAppKeyToAppId(key);
        } catch (e) {
          // If you are a Chrome App, and you do have a key in your manifest, and its invalid, we shouldn't pretend to return a valid appId
          console.error('Your manifest file has an invalid \'key\', cannot produce application id.');
          // leaving appId undefined.
        }
      }
    } else {
      // TODO: return fully qualified name given during cordova project creation
      cachedAppId = manifest['name'];
    }
  }
  return cachedAppId;
}
exports.__defineGetter__("id", getAppId);

exports.getPlatformInfo = function(callback) {
  var platformInfo = {};
  platformInfo.os = 'cordova-' + cordova.platformId;

  // The other two expected members do not apply meaningfully here.
  // TODO(maxw): Or do they?
  platformInfo.arch = null;
  platformInfo.nacl_arch = null;

  // Send the platform info to the callback.
  callback(platformInfo);
};

stubs.createStub(exports, 'requestUpdateCheck', function(){});
