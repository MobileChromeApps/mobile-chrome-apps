// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerManualTests('chrome-navigation', function(rootEl, addButton) {
  rootEl.innerHTML =
      '<center><b>Should be no-ops:</b><br><br>' +
      '<a href="http://www.google.com">plain link</a><br><br>' +
      '<a href="http://www.google.com" target="_self">link target=_self</a><br><br>' +
      '<a href="#foo">#foo</a><br><br>' +
      '<a href="#bar">#bar</a><br><br>' +
      '<b>Should open in Browser</b><br><br>' +
      '<a href="http://www.google.com" target="_blank">link target=_blank</a><br><br>' +
      '<a href="http://www.google.com" target="_system">link target=_system</a><br><br>' +
      '<a href="http://www.google.com" target="foo">link target=foo</a><br><br>' +
      '<b>Other</b><br><br>';

  addButton('location = google.com (no-op)', function() {
    top.location = 'http://www.google.com';
  });
  addButton('location.replace() (no-op)', function() {
    top.location.replace('http://www.google.com');
  });
  addButton('window.open() (open browser)', function() {
    top.open('http://www.google.com');
  });
  addButton('location = location', function() {
    top.location = top.location.href;
  });
  addButton('location.reload()', function() {
    top.location.reload();
  });
  addButton('chrome-extension iframe', function() {
    var el = rootEl.ownerDocument.createElement('iframe');
    el.src = 'assets/iframewnd.html';
    rootEl.appendChild(el);
  });
});

