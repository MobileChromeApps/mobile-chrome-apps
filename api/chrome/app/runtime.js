// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

define('chrome.app.runtime', function(require, module) {
  var events = require('helpers.events');
  var exports = module.exports;
  exports.onLaunched = {};
  exports.onLaunched.addListener = events.addListener('onLaunched');
  exports.onLaunched.fire = events.fire('onLaunched');
});

