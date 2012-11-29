// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

define('chrome.mobile.impl', function(require, module) {
  var chrome = window.chrome;
  var exports = module.exports;
  var eventIframe = null;

  exports.init = function() {
    function loadIframe(callback) {
      var iframe = document.createElement('iframe');
      iframe.src = 'chromebgpage.html';
      iframe.style.display = 'none';
      iframe.onload = function() {
        iframe.onload = null;
        eventIframe = iframe;
        callback();
      };
      document.body.appendChild(iframe);
    }

    function loadBgPage() {
      var manifestJson = chrome.runtime.getManifest();
      var scripts = manifestJson.app.background.scripts;
      var iframeDoc = eventIframe.contentDocument;
      var numScriptsLoaded = 0;
      function injectScript(path) {
        var scriptNode = iframeDoc.createElement('script');
        scriptNode.onload = afterScriptsLoaded;
        scriptNode.src = path;
        iframeDoc.body.appendChild(scriptNode);
      }
      function afterScriptsLoaded() {
        this.onload = null;
        if (++numScriptsLoaded == scripts.length) {
          chrome.app.runtime.onLaunched.fire();
        }
      }
      exports.fgWindow = window;
      exports.bgWindow = eventIframe.contentWindow;
      exports.eventIframe = eventIframe;
      exports.bgWindow.chrome = chrome;

      for (var i = 0, scriptPath; scriptPath = scripts[i]; ++i) {
        injectScript(scriptPath);
      }
    }
    // Self-destruct so that code in here can be GC'ed.
    exports.init = null;
    loadIframe(loadBgPage);

  };
});
