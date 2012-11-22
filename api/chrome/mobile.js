// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

define('chrome.mobile.impl', function(require, module) {
  var exports = module.exports;

  exports.init = function(fgWindow, eventIframe) {
    exports.fgWindow = fgWindow;
    exports.bgWindow = eventIframe.contentWindow;
    exports.eventIframe = eventIframe;
    exports.bgWindow.chrome = window.chrome;
  };
});
