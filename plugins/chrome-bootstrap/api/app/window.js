// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var Event = require('org.chromium.common.events');
var mobile = require('org.chromium.bootstrap.mobile.impl');
var runtime = require('org.chromium.runtime.runtime');
var ChromeExtensionURLs = require('org.chromium.bootstrap.helpers.ChromeExtensionURLs');

// The AppWindow created by chrome.app.window.create.
var createdAppWindow = null;
var dummyNode = document.createElement('a');

function AppWindow() {
  this.contentWindow = mobile.fgWindow;
  this.id = '';
}

function unsupportedApi(api) {
  return function() {
    console.warn(api + ' is not supported on mobile.');
  };
}

AppWindow.prototype = {
  restore: unsupportedApi('AppWindow.restore'),
  moveTo: unsupportedApi('AppWindow.moveTo'),
  clearAttention: unsupportedApi('AppWindow.clearAttention'),
  minimize: unsupportedApi('AppWindow.minimize'),
  drawAttention: unsupportedApi('AppWindow.drawAttention'),
  focus: unsupportedApi('AppWindow.focus'),
  resizeTo: unsupportedApi('AppWindow.resizeTo'),
  maximize: unsupportedApi('AppWindow.maximize'),
  close: unsupportedApi('AppWindow.close'),
  setBounds: unsupportedApi('AppWindow.setBounds'),
  onBoundsChanged: new Event('onBoundsChanged'),
  onClosed: new Event('onClosed')
};
AppWindow.prototype.getBounds = function() {
  return {
    width: 0,
    height: 0,
    left: 0,
    top: 0
  };
};

function copyAttributes(srcNode, destNode) {
  var attrs = srcNode.attributes;
  for (var i = 0, attr; attr = attrs[i]; ++i) {
    destNode.setAttribute(attr.name, attr.value);
  }
}

function applyAttributes(attrText, destNode) {
  dummyNode.innerHTML = '<a ' + attrText + '>';
  copyAttributes(dummyNode.firstChild, destNode);
}

// Evals the scripts in order.
function evalScripts(rootNode, afterFunc) {
  var scripts = rootNode.getElementsByTagName('script');
  var doc = rootNode.ownerDocument;
  var numRemaining = scripts.length;
  function onLoadCallback(a) {
    if (!numRemaining--) {
      afterFunc && afterFunc();
    }
  }
  for (var i = 0, script; script = scripts[i]; ++i) {
    if (script.type && !(/text\/javascript/i.exec(script.type) || /application\/javascript/i.exec(script.type))) {
      onLoadCallback();
    } else if (script.src) {
      var replacement = doc.createElement('script');
      copyAttributes(script, replacement);
      replacement.onload = onLoadCallback;
      replacement.onerror = onLoadCallback;
      replacement.async = false;
      script.parentNode.replaceChild(replacement, script);
    } else {
      // Skip over inline scripts.
      console.warn('Refused to execute inline script because it violates the following Content Security Policy directive: "default-src \'self\' chrome-extension-resource:"');
      console.warn('Script contents:');
      console.warn(script.textContent.slice(0, 100) + (script.textContent.length > 100 ? '<truncated>' : ''));
      onLoadCallback();
    }
  }
  // Handle the no scripts case.
  onLoadCallback();
}

function rewritePage(pageContent, filePath) {
  var fgBody = document.body;
  var fgHead = fgBody.previousElementSibling;

  // fgHead.innerHTML causes a DOMException on Android 2.3.
  while (fgHead.lastChild) {
    fgHead.removeChild(fgHead.lastChild);
  }

  var startIndex = pageContent.search(/<html([\s\S]*?)>/i);
  if (startIndex != -1) {
    startIndex += RegExp.lastMatch.length;
    // Copy over the attributes of the <html> tag.
    applyAttributes(RegExp.lastParen, fgBody.parentNode);
  } else {
    startIndex = 0;
  }

  // Put everything before the body tag in the head.
  var endIndex = pageContent.search(/<body([\s\S]*?)>/i);
  if (endIndex == -1) {
    mobile.eventIframe.insertAdjacentHTML('afterend', 'Load error: Page is missing body tag.');
  } else {
    applyAttributes(RegExp.lastParen, fgBody);

    // Don't bother removing the <body>, </body>, </html>. The browser's sanitizer removes them for us.
    var headHtml = pageContent.slice(startIndex, endIndex);
    pageContent = pageContent.slice(endIndex);

    fgHead.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="' + runtime.getURL('plugins/org.chromium.bootstrap/chromeappstyles.css') + '">');
    fgHead.insertAdjacentHTML('beforeend', headHtml);
    evalScripts(fgHead, function() {
      mobile.eventIframe.insertAdjacentHTML('afterend', pageContent);
      evalScripts(fgBody, ChromeExtensionURLs.releaseReadyWait);
    });
  }
}

function fixLocationObjects() {
  var hostDescriptor = {
    configurable: false,
    enumerable: true,
    get: function() {
      var parts = /^([^:]*):\/\/([^/]*)(\/[^#?]*)/.exec(this.href);
      return parts[2];
    }
  };
  // Android KK incorrectly parses chrome-extension:// URLs
  if (document.location.host === "") {
    Object.defineProperty(document.location, "host", hostDescriptor);
    Object.defineProperty(document.location, "hostname", hostDescriptor);
    Object.defineProperty(document.location, "pathname", {
      configurable: false,
      enumerable: true,
      get: function() {
        var parts = /^([^:]*):\/\/([^/]*)(\/[^#?]*)/.exec(this.href);
        return parts[3];
      }
    });
    Object.defineProperty(document.location, "origin", {
      configurable: false,
      enumerable: true,
      get: function() {
        var parts = /^([^:]*:\/\/[^/]*)(\/[^#?]*)/.exec(this.href);
        return parts[1];
      }
    });
  }
  // This is needed for both pre- and post-KK Android, but throws an exception on Safari
  if (document.domain === "") {
    try {
      Object.defineProperty(document, "domain", {
        configurable: false,
        enumerable: true,
        get: function() {
          var parts = /^([^:]*):\/\/([^/]*)(\/[^#?]*)/.exec(this.location.href);
          return parts[2];
        }
      });
    } catch (e) {}
  }
}

exports.create = function(filePath, options, callback) {
  if (createdAppWindow) {
    console.log('ERROR - chrome.app.window.create called multiple times. This is unsupported.');
    return;
  }
  createdAppWindow = new AppWindow();

  var anchorEl = mobile.bgWindow.document.createElement('a');
  anchorEl.href = filePath;
  var resolvedUrl = anchorEl.href;
  // Use background page's XHR so that relative URLs are relative to it.
  var xhr = new XMLHttpRequest();
  xhr.open('GET', resolvedUrl, true);
  // Android pre KK doesn't support onloadend.
  xhr.onload = xhr.onerror = function() {
    // Change the page URL before the callback.
    history.replaceState(null, null, resolvedUrl);
    fixLocationObjects();
    // Call the callback before the page contents loads.
    if (callback) {
      callback(createdAppWindow);
    }
    var pageContent = xhr.responseText || 'Page load failed.';
    rewritePage(pageContent, filePath);
  };
  xhr.send();
};

exports.current = function() {
  return window == mobile.fgWindow ? createdAppWindow : null;
};
