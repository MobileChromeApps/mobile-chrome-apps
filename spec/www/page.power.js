// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromespec.registerSubPage('chrome.power', function(rootEl) {
  function addButton(name, func) {
    var button = chromespec.createButton(name, func);
    rootEl.appendChild(button);
  }

  addButton('Request Keep-Awake', function() {
    chrome.power.requestKeepAwake('system');
    chromespec.log('Requested keep-awake.');
  });

  addButton('Release Keep-Awake', function() {
    chrome.power.releaseKeepAwake();
    chromespec.log('Released keep-awake.');
  });
});

