// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var chrome = window.chrome;

exports.fgWindow = window;
exports.bgWindow = null;
exports.eventIframe = null;

function createBgChrome() {
  return {
    __proto__: chrome,
    app: {
      __proto__: chrome.app,
      window: {
        __proto__: chrome.app.window,
        current: function() { return null; }
      }
    }
  };
}

var bootstrap = require("org.chromium.chrome-app-bootstrap.bootstrap");

//TODO: This is conditional on the app launching with the intention of bringing up the UI
bootstrap.onBackgroundPageLoaded.addListener(function() {
  chrome.app.runtime.onLaunched.fire();
});

exports.init = function() {
  // Assigning innerHTML here has the side-effect of removing the
  // chrome-content-loaded script tag. Removing it is required so that the
  // page re-writting logic does not try and re-evaluate it.
  document.body.innerHTML = '<iframe src="chromebgpage.html" style="display:none">';

  exports.eventIframe = document.body.firstChild;
};

exports.bgInit = function(bgWnd) {
  exports.bgWindow = bgWnd;

  require('cordova/modulemapper').mapModules(bgWnd.window);

  bgWnd.navigator = navigator;
  bgWnd.chrome = createBgChrome();
  exports.fgWindow.opener = exports.bgWindow;

  function onLoad() {
    bgWnd.removeEventListener('load', onLoad, false);
    setTimeout(function() {
      bootstrap.onBackgroundPageLoaded.fire();
    }, 0);
  }
  bgWnd.addEventListener('load', onLoad, false);

  var manifestJson = chrome.runtime.getManifest();
  var scripts = manifestJson.app.background.scripts;
  var toWrite = '';
  for (var i = 0, src; src = scripts[i]; ++i) {
    toWrite += '<script src="' + encodeURI(src) + '"></sc' + 'ript>\n';
  }
  bgWnd.document.write(toWrite);
};
