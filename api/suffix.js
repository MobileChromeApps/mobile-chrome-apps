// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Concluding code for the APIs, with the implementation of require and inclusion of main.
// Load the module 'chrome' to kick things off.

  function exportSymbol(name, object) {
    var parts = name.split('.');
    var cur = window;
    for (var i = 0, part; part = parts[i++];) {
      if (i == parts.length) {
        cur[part] = object;
      } else if (cur[part]) {
        cur = cur[part];
      } else {
        cur = cur[part] = {};
      }
    }
  }
  // Create the root symbol. This will clobber Chrome's native symbol if applicable.
  chrome = {};
  for (var key in modules) {
    if (key.indexOf('chrome.') == 0) {
      exportSymbol(key, require(key));
    }
  }

// Close the wrapping function and call it.
})();
