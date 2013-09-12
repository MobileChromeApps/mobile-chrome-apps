// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Initialization code for the Chrome plugins API.

var channel = require('cordova/channel')

// Add a sticky Cordova event to indicate that the background page has
// loaded, and the JS has executed.
exports.onBackgroundPageLoaded = channel.createSticky('onBackgroundPageLoaded');

window.onChromeCorsReady = function() {



// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function proxyMethod(methodName) {
    return function() {
        this._proxy[methodName].apply(this._proxy, arguments);
    }
}
function proxyProperty(_this, propertyName, writable) {
    var descriptor = {
        configurable: true,
        get: function() { return _this._proxy[propertyName]; }
    };
    if (writable) {
        descriptor.set = function(val) { _this._proxy[propertyName] = val; };
    }
    Object.defineProperty(_this, propertyName, descriptor);
}

var nativeXHR = window.XMLHttpRequest;
function blobXHR() {
    var that=this;
    this._proxy = new nativeXHR();
    this._response = null;
    this._overrideResponseType = "";
    /* Proxy read/write properties */
    ['timeout','withCredentials','onreadystatechange','onloadstart','onprogress','onabort','onerror','onload','ontimeout','onloadend'].forEach(function(elem) {
        proxyProperty(that, elem, true);
    });
    /* Proxy read-only properties */
    ['upload','readyState','status','statusText','responseText','responseXML'].forEach(function(elem) {
        proxyProperty(that, elem);
    });
    /* Proxy responseType: If responseType is set to 'blob', then set the delegate
       XHR's property to 'arraybuffer', and record the passed-in value so that it
       can be returned properly if requested.
     */
    Object.defineProperty(this, 'responseType', {
        configurable: true,
        get: function() {
            return this._overrideResponseType;
        },
        set: function(val) {
            if (val === 'blob') {
                this._proxy.responseType = 'arraybuffer';
                this._overrideResponseType = 'blob';
            } else {
                this._proxy.responseType = val;
                this._overrideResponseType = this._proxy.responseType;
            }
        }
    });
    /* Proxy response: If the responseType was set to 'blob', then package the
       returned arraybuffer in a Blob object and return it.
     */
    Object.defineProperty(this, 'response', {
        configurable: true,
        get: function() {
            if (this._overrideResponseType === 'blob') {
                if (this.readyState !== 4) return null;
                if (this._response === null) {
                    var ct = this._proxy.getResponseHeader('content-type');
                    this._response = new Blob([this._proxy.response], {type: ct});
                }
                return this._response;
            } else {
                return this._proxy.response;
            }
        }
    });
}
/* Proxy methods */
['setRequestHeader','send','abort','getResponseHeader','getAllResponseHeaders','overrideMimeType'].forEach(function(elem) {
    blobXHR.prototype[elem] = proxyMethod(elem);
});

blobXHR.prototype.open = function(method, url) {
  if (url.indexOf('http') == 0) {
    this._proxy = new corsXMLHttpRequest();
  }
        this._proxy.open.apply(this._proxy, arguments);
        };

window.XMLHttpRequest = blobXHR;



  require('org.chromium.chrome-bootstrap.mobile.impl').init();
}

// Add a deviceready listener that initializes the Chrome wrapper.
channel.onCordovaReady.subscribe(function() {
  // Delay bootstrap until all deviceready event dependancies fire, minus DOMContentLoaded, since that one is purposely being blocked by bootstrap
  // We do this delay so that plugins have a chance to initialize using the bridge before we load the chrome app background scripts/event page
  var channelsToWaitFor = channel.deviceReadyChannelsArray.filter(function(c) { return c.type !== 'onDOMContentLoaded'; });
  channel.join(function() {
    // Save the original XHR object; we may need it during bootstrap
    window.origXMLHttpRequest = XMLHttpRequest;
    if (navigator.userAgent.indexOf("Android") > 0) {
      // On Android, open a background window to handle CORS requests
      window.constructor.prototype.open.call(window, 'foo', 'bar');
    } else {
      // On other platforms, continue with initialization
      window.onChromeCorsReady();
    }
  }, channelsToWaitFor);
});
