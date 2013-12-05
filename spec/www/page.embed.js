// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromespec.registerSubPage('chrome.embed', function(rootEl) {
  function addButton(name, func) {
    var button = chromespec.createButton(name, func);
    rootEl.appendChild(button);
  }

  addButton('Get image via XHR (traditional events)', function() {
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

  addButton('Get image via XHR (DOM2 Events)', function() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'http://www.apache.org/images/feather-small.gif', true);
    xhr.responseType = 'blob';
    xhr.addEventListener('load', function(e) {
      var doc = chromespec.fgDoc;
      var img = doc.createElement('img');
      img.src = window.webkitURL.createObjectURL(this.response);
      doc.getElementById('page-container').appendChild(img);
    });
    xhr.send();
  });

  addButton('Get image via RAL', function() {
    var wnd = chromespec.fgWnd;
    var doc = chromespec.fgDoc;
    var RAL = window.RAL || chromespec.fgWnd.RAL;
    var remoteImage = new RAL.RemoteImage({src:'http://www.apache.org/images/feather-small.gif'});
    var container = doc.querySelector('#page-container');

    container.appendChild(remoteImage.element);
    RAL.Queue.add(remoteImage);
    RAL.Queue.setMaxConnections(4);
    RAL.Queue.start();
  });
});

