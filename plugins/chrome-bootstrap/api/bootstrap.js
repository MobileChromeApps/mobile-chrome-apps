// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Initialization code for the Chrome plugins API.

var channel = require('cordova/channel')

// Add a sticky Cordova event to indicate that the background page has
// loaded, and the JS has executed.
exports.onBackgroundPageLoaded = channel.createSticky('onBackgroundPageLoaded');

// Add a deviceready listener that initializes the Chrome wrapper.
channel.onCordovaReady.subscribe(function() {
  require('org.chromium.chrome-app-bootstrap.mobile.impl').init();
});
