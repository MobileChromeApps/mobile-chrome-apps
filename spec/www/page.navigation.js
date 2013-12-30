// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromespec.registerSubPage('chrome-navigation', function(rootEl) {
  rootEl.innerHTML =
      '<a href="http://www.google.com">www.google.com</a><br><br>' +
      '<a href="http://www.google.com" target="_blank">www.google.com (target=_blank)</a><br><br>' +
      '<a href="http://www.google.com" target="_system">www.google.com (target=_system)</a><br><br>' +
      '<a href="http://www.google.com" target="_self">www.google.com (target=_self)</a><br><br>' +
      '<a href="#foo">#foo</a> (shouldn\'t navigate)<br><br>' +
      '<a href="#bar">#bar</a> (shouldn\'t navigate)<br><br>';
  function addButton(name, func) {
    var button = chromespec.createButton(name, func);
    rootEl.appendChild(button);
  }

  addButton('Set location = google.com', function() {
    location = 'http://www.google.com';
  });
  addButton('location.replace(google.com)', function() {
    location.replace('http://www.google.com');
  });
  addButton('window.open(google.com)', function() {
    window.open('http://www.google.com');
  });
});

