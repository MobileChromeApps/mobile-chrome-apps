// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

require('cordova/channel').onDeviceReady.subscribe(function() {
  function openExternally(e) {
    var href = e.target.href;
    // TODO Ignore urls that are not actually page navigations
    e.preventDefault();
    window.open(href, '_system');
  }
  Array.prototype.slice.call(document.getElementsByTagName('a')).forEach(function(el) {
    if (el.onclick)
      return;
    el.onclick = openExternally;
  });
});
