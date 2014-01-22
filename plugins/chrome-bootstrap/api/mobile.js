// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var channel = require('cordova/channel')
var runtime = require('org.chromium.runtime.runtime');
var app_runtime = require('org.chromium.runtime.app.runtime');
var storage = require('org.chromium.storage.Storage');
// Make sure the "isChromeApp" var gets set before replaceState().
require('org.chromium.common.helpers');

exports.fgWindow = window;
exports.bgWindow = null;
exports.eventIframe = null;

// Add a sticky Cordova event to indicate that the background page has
// loaded, and the JS has executed.
exports.onBackgroundPageLoaded = channel.createSticky('onBackgroundPageLoaded');

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

exports.boot = function() {
  // Add a deviceready listener that initializes the Chrome wrapper.
  channel.onCordovaReady.subscribe(function() {
    // Delay bootstrap until all deviceready event dependancies fire, minus DOMContentLoaded, since that one is purposely being blocked by bootstrap
    // We do this delay so that plugins have a chance to initialize using the bridge before we load the chrome app background scripts/event page
    var channelsToWaitFor = channel.deviceReadyChannelsArray.filter(function(c) { return c.type !== 'onDOMContentLoaded'; });
    channel.join(function() {
      // Assigning innerHTML here has the side-effect of removing the
      // chrome-content-loaded script tag. Removing it is required so that the
      // page re-writting logic does not try and re-evaluate it.
      document.body.innerHTML = '<iframe src="chromebgpage.html" style="display:none">';

      exports.eventIframe = document.body.firstChild;
    }, channelsToWaitFor);
  });
};

exports.bgInit = function(bgWnd) {
  exports.bgWindow = bgWnd;

  require('cordova/modulemapper').mapModules(bgWnd.window);

  bgWnd.navigator = navigator;
  // HACK: Make the bg page use the foreground windows possibly polyfill'ed XHR
  // This breaks relative URLs if fgWnd and bgWnd are at different paths.
  // Could be fixed by just re-applying the polyfill in the background page.
  bgWnd.XMLHttpRequest = XMLHttpRequest;
  bgWnd.chrome = createBgChrome();
  exports.fgWindow.opener = exports.bgWindow;

  var manifestJson = runtime.getManifest();
  function onLoad() {
    bgWnd.removeEventListener('load', onLoad, false);
    setTimeout(function() {
      exports.onBackgroundPageLoaded.fire();
      fireLifecycleEvents(manifestJson);
    }, 0);
  }
  bgWnd.addEventListener('load', onLoad, false);

  bgWnd.history.replaceState(null, null, runtime.getURL('_generated_background_page.html'));

  var scripts = manifestJson.app.background.scripts;
  var toWrite = '';
  for (var i = 0, src; src = scripts[i]; ++i) {
    toWrite += '<script src="' + encodeURI(src) + '"></sc' + 'ript>\n';
  }
  bgWnd.document.write(toWrite);
};

function fireLifecycleEvents(manifestJson) {
  var version = manifestJson.version;

  storage.internal.get(['version', 'shutdownClean'], function(data) {
    var installDetails;
    if (data.version != version) {
      if (data.version) {
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
        app_runtime.onRestarted.fire();
      }
      if (installDetails) {
        runtime.onInstalled.fire(installDetails);
      }
      // If launching for UI, fire onLaunched event
      var exec = require("cordova/exec");
      exec(function(data) {
        if (data) {
          app_runtime.onLaunched.fire();
        }
        // Log a warning if no window is created after a bit of a grace period.
        setTimeout(function() {
          var app_window = require('org.chromium.bootstrap.app.window');
          if (!app_window.current()) {
            console.warn('No page loaded because chrome.app.window.create() was never called.');
          }
        }, 500);
      }, null, "ChromeBootstrap", "doesNeedLaunch", []);
    });
  });
}

