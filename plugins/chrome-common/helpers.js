// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Distinguish between having the plugin loaded vs. being run using chromeapp.html.
var isChromeApp = /chromeapp.html$/.exec(location.href);

exports.runAtStartUp = function(func) {
  if (isChromeApp) {
    var mobile = require('org.chromium.bootstrap.mobile.impl');
    mobile.onBackgroundPageLoaded.subscribe(func);
  } else {
    document.addEventListener('deviceready', func, false);
  }
};
