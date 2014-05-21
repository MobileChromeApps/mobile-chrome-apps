// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


// Support was added in iOS7.
var xhr = new XMLHttpRequest();
xhr.open('GET', '', true);
xhr.responseType = 'blob';
if (xhr.responseType == 'blob') {
    return;
}

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

function proxyProgressEventHandler(_this, eventName, handler) {
    return function(pe) {
        new_pe = new ProgressEvent(eventName);
        new_pe.target = _this;
        handler.call(_this, new_pe);
    }
}

function proxyEventProperty(_this, eventName) {
    var eventPropertyName = "on" + eventName.toLowerCase();
    var descriptor = {
        configurable: true,
        get: function() { return _this._proxy[eventPropertyName]; },
        set: function(handler) {
           _this._proxy[eventPropertyName]= proxyProgressEventHandler(_this, eventName, handler);
        }
    };
    Object.defineProperty(_this, eventPropertyName, descriptor);
}

var nativeXHR = window.XMLHttpRequest;
function chromeXHR() {
    var that=this;
    this._proxy = new nativeXHR();
    this._response = null;
    this._overrideResponseType = "";
    /* Proxy events */
    ['loadstart','progress','abort','error','load','timeout','loadend'].forEach(function(elem) {
        proxyEventProperty(that, elem);
    });
    /* Proxy read/write properties */
    ['onreadystatechange','timeout','withCredentials'].forEach(function(elem) {
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
['open','setRequestHeader','send','abort','getResponseHeader','getAllResponseHeaders','overrideMimeType', 'addEventListener', 'removeEventListener'].forEach(function(elem) {
    chromeXHR.prototype[elem] = proxyMethod(elem);
});
chromeXHR.prototype.addEventListener = function(eventName, handler) {
  this._proxy.addEventListener(eventName, proxyProgressEventHandler(this, eventName.toLowerCase(), handler));
}

exports.XMLHttpRequest = chromeXHR;
