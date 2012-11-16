define('chrome.app.window', function(require, module) {
  var events = require('helpers.events');
  var mobile = require('chrome.mobile.impl');
  var exports = module.exports;

  // The AppWindow created by chrome.app.window.create.
  var createdAppWindow = null;
  var dummyNode = document.createElement('a');

  function AppWindow() {
    this.contentWindow = mobile.fgWindow;
    this.id = '';
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
    onClosed: { addListener: events.addListener('onClosed') }
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

  function evalScripts(rootNode) {
    var scripts = rootNode.getElementsByTagName('script');
    var doc = rootNode.ownerDocument;
    for (var i = 0, script; script = scripts[i]; ++i) {
      var replacement = doc.createElement('script');
      copyAttributes(script, replacement);
      // Don't bother with copying the innerHTML since chrome apps do not
      // support inline scripts.
      script.parentNode.replaceChild(replacement, script);
    }
  }

  function rewritePage(pageContent) {
    var fgBody = mobile.fgWindow.document.body;
    var fgHead = fgBody.previousElementSibling;

    var startIndex = pageContent.search(/<html([\s\S]*?)>/i);
    if (startIndex == -1) {
      mobile.eventIframe.insertSiblingHTML(pageContent);
    } else {
      startIndex = startIndex + RegExp.lastMatch.length;
      // Copy over the attributes of the <html> tag.
      applyAttributes(RegExp.lastParen, fgBody.parentNode);

      var endIndex = pageContent.search(/<\/head\s*>/i);
      var headHtml = pageContent.slice(startIndex, endIndex);
      pageContent = pageContent.slice(endIndex + RegExp.lastMatch.length);

      // Remove the <head> tag, and copy over its attributes.
      headHtml = headHtml.replace(/<head\b([\s\S]*?)>/i, '');
      applyAttributes(RegExp.lastParen, fgHead);

      headHtml = '<link rel="stylesheet" href="chromeappstyles.css">\n' + headHtml;
      // fgHead.innerHTML causes a DOMException on Android 2.3.
      while (fgHead.lastChild) {
        fgHead.removeChild(fgHead.lastChild);
      }
      fgHead.insertAdjacentHTML('beforeend', headHtml);
      evalScripts(fgHead);

      // Copy the <body> tag attributes.
      pageContent.search(/<body([\s\S]*?)>/i);
      applyAttributes(RegExp.lastParen, fgBody);
      // Don't bother removing the <body>, </body>, </html>. The browser's sanitizer removes them for us.
      mobile.eventIframe.insertAdjacentHTML('afterend', pageContent);
      evalScripts(fgBody);
    }
  }

  exports.create = function(filePath, options, callback) {
    if (createdAppWindow) {
      console.log('ERROR - chrome.app.window.create called multiple times. This is unsupported.');
      return;
    }
    createdAppWindow = new AppWindow();
    var xhr = new XMLHttpRequest();
    xhr.open('GET', filePath, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        // Call the callback before the page contents loads.
        if (callback) {
          callback(createdAppWindow);
        }
        var pageContent = xhr.responseText || 'Page load failed.';
        rewritePage(pageContent);
        cordova.fireWindowEvent('DOMContentReady');
        cordova.fireWindowEvent('load');
      }
    };
    xhr.send();
  };

  exports.current = function() {
    return window == mobile.fgWindow ? createdAppWindow : null;
  };
});
