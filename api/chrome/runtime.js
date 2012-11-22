// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

define('chrome.runtime', function(require, module) {
  var events = require('helpers.events');
  var exports = module.exports;
  var manifestJson = null;

  exports.onSuspend = {};

  exports.onSuspend.fire = events.fire('onSuspend');

  // Uses a trampoline to bind the Cordova pause event on the first call.
  exports.onSuspend.addListener = function(f) {
    window.document.addEventListener('pause', exports.onSuspend.fire, false);
    var h = events.addListener('onSuspend');
    console.log('sub-handler type: ' + typeof h);
    exports.onSuspend.addListener = h;
    exports.onSuspend.addListener(f);
  };

  exports.getManifest = function() {
    if (!manifestJson) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'manifest.json', false /* sync */);
      xhr.send(null);
      manifestJson = JSON.parse(xhr.responseText);
    }
    return manifestJson;
  };
});

