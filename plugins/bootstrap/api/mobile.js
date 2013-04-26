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

exports.init = function() {
  var iframe = document.createElement('iframe');
  iframe.src = 'chromebgpage.html';
  iframe.style.display = 'none';
  exports.eventIframe = iframe;
  document.body.appendChild(iframe);
  // Remove the script chrome-content-loaded script tag so that it
  // is not re-injected when re-writing the page.
  var scriptTag = document.body.querySelector('script');
  scriptTag.parentNode.removeChild(scriptTag);
};

exports.bgInit = function(bgWnd) {
  // Self-destruct so that code in here can be GC'ed.
  exports.bgInit = null;
  exports.bgWindow = bgWnd;

  require('cordova/modulemapper').mapModules(bgWnd.window);

  bgWnd.chrome = createBgChrome();
  exports.fgWindow.opener = exports.bgWindow;

  function onLoad() {
    bgWnd.removeEventListener('load', onLoad, false);
    setTimeout(function() {
      chrome.app.runtime.onLaunched.fire();
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
