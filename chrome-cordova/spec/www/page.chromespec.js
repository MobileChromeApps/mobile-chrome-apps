// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromespec.registerSubPage('chromespec', function(rootEl) {
  var subPages = chromespec.subPages;
  for (var i = 1; i < subPages.length; ++i) {
    var button = chromespec.createButton(subPages[i].name, chromespec.changePage.bind(null, i));
    rootEl.appendChild(button);
  }
});
