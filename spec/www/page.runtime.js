// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromespec.registerSubPage('chrome.runtime', function(rootEl) {
  function addButton(name, func) {
    var button = chromespec.createButton(name, func);
    rootEl.appendChild(button);
  }

  addButton('Attach onSuspend', function() {
    var buttonTime = new Date();
    chrome.runtime.onSuspend.addListener(function() {
      var callbackTime = new Date();
      chromespec.log('onSuspend fired: ' + (callbackTime - buttonTime) + 'ms after button');
    });
  });

  addButton('chrome.runtime.reload()', function() {
    chrome.runtime.reload();
  });

  addButton('chrome.runtime.getPlatformInfo()', function() {
    var getPlatformInfoCallback = function(platformInfo) {
      chromespec.log("Platform OS: " + platformInfo.os);
      chromespec.log("Platform architecture (currently intended to be null): " + platformInfo.arch);
      chromespec.log("Platform architecture (NaCl, currently intended to be null): " + platformInfo.nacl_arch);
    };

    chrome.runtime.getPlatformInfo(getPlatformInfoCallback);
  });
});
