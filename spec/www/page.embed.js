// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromespec.registerSubPage('chrome.embed', function(rootEl) {
  function addButton(name, func) {
    var button = chromespec.createButton(name, func);
    rootEl.appendChild(button);
  }

  addButton('Get image', function() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'http://www.apache.org/images/feather-small.gif', true);
    xhr.responseType = 'blob';
    xhr.onload = function(e) {
      var doc = chromespec.fgDoc;
      var img = doc.createElement('img');
      img.src = window.webkitURL.createObjectURL(this.response);
      doc.getElementById('page-container').appendChild(img);
    };
    xhr.send();
  });
});

