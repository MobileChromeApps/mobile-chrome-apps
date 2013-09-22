// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var runtime = require('org.chromium.runtime.runtime');
var app_runtime = require('org.chromium.runtime.app.runtime');
var storage = require('org.chromium.storage.Storage');

exports.fgWindow = window;
exports.bgWindow = null;
exports.eventIframe = null;

function createBgChrome() {
  return {
    __proto__: window.chrome,
    app: {
      __proto__: window.chrome.app,
      window: {
        __proto__: window.chrome.app.window,
        current: function() { return null; }
      }
    }
  };
}

exports.init = function() {
  // Assigning innerHTML here has the side-effect of removing the
  // chrome-content-loaded script tag. Removing it is required so that the
  // page re-writting logic does not try and re-evaluate it.
  document.body.innerHTML = '<iframe src="chromebgpage.html" style="display:none">';

  exports.eventIframe = document.body.firstChild;
};

exports.bgInit = function(bgWnd) {
  var bootstrap = require("org.chromium.bootstrap.bootstrap");
  var exec = require("cordova/exec");

  exports.bgWindow = bgWnd;

  require('cordova/modulemapper').mapModules(bgWnd.window);

  bgWnd.navigator = navigator;
  bgWnd.XMLHttpRequest = XMLHttpRequest;
  bgWnd.chrome = createBgChrome();
  exports.fgWindow.opener = exports.bgWindow;

  function onLoad() {
    bgWnd.removeEventListener('load', onLoad, false);
    setTimeout(function() {
      bootstrap.onBackgroundPageLoaded.fire();
    }, 0);
  }
  bgWnd.addEventListener('load', onLoad, false);

  var manifestJson = runtime.getManifest();
  var version = manifestJson.version;

  storage.internal.get(['version', 'shutdownClean'], function(data) {
    var installDetails;
    if (data.version != version) {
      if(data.version) {
        installDetails = {
          reason: "update",
          previousVersion: data.version
        };
      } else {
        installDetails = {
          reason: "install"
        };
      }
    }
    // If it was not cleanly shut down, and it was not just installed, then
    // this is a restart.
    var restart = !data.shutdownClean && data.version;

    // Clear the clean shutdown flag on startup
    storage.internal.set({'version': version, 'shutdownClean': false}, function() {
      // Add some additional startup events if the app was not shut down properly
      // last time, or if it has been upgraded, or if it has just been intstalled.
      if (restart) {
        bootstrap.onBackgroundPageLoaded.subscribe(function() {
          app_runtime.onRestarted.fire();
        });
      }
      if (installDetails) {
        bootstrap.onBackgroundPageLoaded.subscribe(function() {
          runtime.onInstalled.fire(installDetails);
        });
      }

      // If launching for UI, fire onLaunched event
      bootstrap.onBackgroundPageLoaded.subscribe(function() {
        exec(function(data) {
          if (data) {
            app_runtime.onLaunched.fire();
          }
        }, null, "ChromeBootstrap", "doesNeedLaunch", []);
      });

    });
  });

  var scripts = manifestJson.app.background.scripts;
  var toWrite = '';
  for (var i = 0, src; src = scripts[i]; ++i) {
    toWrite += '<script src="' + encodeURI(src) + '"></sc' + 'ript>\n';
  }
  bgWnd.document.write(toWrite);
};
