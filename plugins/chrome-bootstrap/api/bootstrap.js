// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Initialization code for the Chrome plugins API.
// Adds a deviceready listener that initializes the Chrome wrapper.

require('cordova/channel').onCordovaReady.subscribe(function() {
  require('org.chromium.chrome-app-bootstrap.mobile.impl').init();
});
