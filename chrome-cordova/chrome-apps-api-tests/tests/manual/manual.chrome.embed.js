// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerManualTests('chrome.embed', function(rootEl, addButton) {
  var wURL = window.URL || window.webkitURL;

  addButton('Get image via XHR (traditional events)', function() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'http://www.apache.org/images/feather-small.gif', true);
    xhr.responseType = 'blob';
    xhr.onload = function(e) {
      var $document = rootEl.ownerDocument;
      var img = $document.createElement('img');
      img.src = wURL.createObjectURL(this.response);
      rootEl.appendChild(img);
    };
    xhr.send();
  });

  addButton('Get image via XHR (DOM2 Events)', function() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'http://www.apache.org/images/feather-small.gif', true);
    xhr.responseType = 'blob';
    xhr.addEventListener('load', function(e) {
      var $document = rootEl.ownerDocument;
      var img = $document.createElement('img');
      img.src = wURL.createObjectURL(this.response);
      rootEl.appendChild(img);
    });
    xhr.send();
  });

  addButton('Get image via RAL', function() {
    var wnd = chrome.app.window.current();
    var RAL = window.RAL || wnd.RAL;
    var remoteImage = new RAL.RemoteImage({src:'http://www.apache.org/images/feather-small.gif'});

    rootEl.appendChild(remoteImage.element);
    RAL.Queue.add(remoteImage);
    RAL.Queue.setMaxConnections(4);
    RAL.Queue.start();
  });
});

