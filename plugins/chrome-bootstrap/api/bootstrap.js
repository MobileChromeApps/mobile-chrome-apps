// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Initialization code for the Chrome plugins API.

var channel = require('cordova/channel')

// Add a sticky Cordova event to indicate that the background page has
// loaded, and the JS has executed.
exports.onBackgroundPageLoaded = channel.createSticky('onBackgroundPageLoaded');

window.onChromeCorsReady = function() {
  require('org.chromium.bootstrap.mobile.impl').init();
}

// Temporary fix for LocalFileSystem interface
window.PERSISTENT = window.PERSISTENT | LocalFileSystem.PERSISTENT;
window.TEMPORARY = window.TEMPORARY | LocalFileSystem.TEMPORARY;

// Add a deviceready listener that initializes the Chrome wrapper.
channel.onCordovaReady.subscribe(function() {
  // Delay bootstrap until all deviceready event dependancies fire, minus DOMContentLoaded, since that one is purposely being blocked by bootstrap
  // We do this delay so that plugins have a chance to initialize using the bridge before we load the chrome app background scripts/event page
  var channelsToWaitFor = channel.deviceReadyChannelsArray.filter(function(c) { return c.type !== 'onDOMContentLoaded'; });
  channel.join(function() {
    // Save the original XHR object; we may need it during bootstrap
    window.origXMLHttpRequest = XMLHttpRequest;
    if (navigator.userAgent.indexOf("Android") > 0) {
      // On Android, open a background window to handle CORS requests
      window.constructor.prototype.open.call(window, '/cors-window', 'bar');
    } else {
      // On other platforms, continue with initialization
      window.onChromeCorsReady();
    }
  }, channelsToWaitFor);
});
