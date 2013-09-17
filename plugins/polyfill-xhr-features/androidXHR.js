// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function proxyMethod(methodName) {
    return function() {
        if (this._activeProxy) {
            this._activeProxy[methodName].apply(this._activeProxy, arguments);
        } else {
            this._nativeProxy[methodName].apply(this._nativeProxy, arguments);
            this._corsProxy[methodName].apply(this._corsProxy, arguments);
        }
    }
}
function proxyProperty(_this, propertyName, writable) {
    var descriptor = {
        configurable: true,
        get: function() {
            if (_this._activeProxy) {
                 return _this._activeProxy[propertyName];
            } else {
                 return _this._nativeProxy[propertyName];
            }
        }
    };
    if (writable) {
        descriptor.set = function(val) {
            if (_this._activeProxy) {
                _this._activeProxy[propertyName] = val;
            } else {
                _this._nativeProxy[propertyName] = val;
                _this._corsProxy[propertyName] = val;
            }
        };
    }
    Object.defineProperty(_this, propertyName, descriptor);
}

var nativeXHR = window.XMLHttpRequest;
function chromeXHR() {
    var that=this;
    this._nativeProxy = new nativeXHR();
    this._corsProxy = new corsXMLHttpRequest();
    this._activeProxy = null;
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
                this._nativeProxy.responseType = 'arraybuffer';
                this._corsProxy.responseType = 'arraybuffer';
                this._overrideResponseType = 'blob';
            } else {
                this._nativeProxy.responseType = val;
                this._corsProxy.responseType = val;
                this._overrideResponseType = val;
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
                    var ct = this._activeProxy.getResponseHeader('content-type');
                    this._response = new Blob([this._activeProxy.response], {type: ct});
                }
                return this._response;
            } else {
                return this._activeProxy.response;
            }
        }
    });
}
/* Proxy methods */
['setRequestHeader','send','abort','getResponseHeader','getAllResponseHeaders','overrideMimeType'].forEach(function(elem) {
    chromeXHR.prototype[elem] = proxyMethod(elem);
});

chromeXHR.prototype.open = function(method, url) {
    if (url.indexOf('http') == 0) {
        this._activeProxy = this._corsProxy;
    } else {
        this._activeProxy = this._nativeProxy;
    }
    this._activeProxy.open.apply(this._activeProxy, arguments);
};

exports.XMLHttpRequest = chromeXHR;
