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
  var srcAttrs = srcNode.attributes;
  var destAttrs = destNode.attributes;
  for (var i = 0, max = destAttrs.length; i < max; ++i) {
    destNode.removeAttribute(destAttrs[i].name);
  }
  for (var i = 0, attr; attr = srcAttrs[i]; ++i) {
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
    if (script.type && !(/text\/javascript/i.exec(script.type) ||
                         /application\/javascript/i.exec(script.type) ||
                         /application\/dart/i.exec(script.type))) {
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

function fixLocationObjects(wnd) {
  var hostDescriptor = {
    configurable: true,
    enumerable: true,
    get: function() {
      var parts = /^([^:]*):\/\/([^/]*)(\/[^#?]*)/.exec(this.href);
      return parts ? parts[2] : "";
    }
  };
  var pathnameDescriptor = {
    configurable: true,
    enumerable: true,
    get: function() {
      var parts = /^([^:]*):\/\/([^/]*)(\/[^#?]*)/.exec(this.href);
      return parts ? parts[3] : this.href;
    }
  };
  var originDescriptor = {
    configurable: true,
    enumerable: true,
    get: function() {
      var parts = /^([^:]*:\/\/[^/]*)(\/[^#?]*)/.exec(this.href);
      return parts ? parts[1] : "null";
    }
  };
  function fixInstance(l) {
    Object.defineProperty(l, 'host', hostDescriptor);
    Object.defineProperty(l, 'hostname', hostDescriptor);
    Object.defineProperty(l, 'pathname', pathnameDescriptor);
    Object.defineProperty(l, 'origin', originDescriptor);
  }
  // Android KK incorrectly parses chrome-extension:// URLs
  if (wnd.location.host === '') {
    fixInstance(wnd.location);
    var origCreateElement = wnd.document.createElement;
    // Also fix up the methods for anchor tags. Angular's location object requires this.
    wnd.document.createElement = function(tagName) {
      var ret = origCreateElement.apply(this, arguments);
      if (tagName === 'a' || tagName === 'A') {
        fixInstance(ret);
      }
      return ret;
    };
  }
  // This is needed for both pre- and post-KK Android, but throws an exception on Safari
  if (wnd.document.domain === '') {
    try {
      Object.defineProperty(wnd.document, 'domain', {
        configurable: false,
        enumerable: true,
        get: function() {
          return this.location.host;
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
    fixLocationObjects(mobile.fgWindow);
    fixLocationObjects(mobile.bgWindow);
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

exports.getAll = function() {
  return createdAppWindow ? [createdAppWindow] : [];
};
