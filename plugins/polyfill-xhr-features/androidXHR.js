// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function proxyMethod(methodName) {
    return function() {
        if (this._activeProxy) {
            this._activeProxy[methodName].apply(this._activeProxy, arguments);
        } else {
            this._nativeProxy[methodName].apply(this._nativeProxy, arguments);
            if (this._corsProxy) this._corsProxy[methodName].apply(this._corsProxy, arguments);
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
                if (_this._corsProxy) _this._corsProxy[propertyName] = val;
            }
        };
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
        get: function() {
            if (_this._activeProxy) {
                 return _this._activeProxy[propertyName];
            } else {
                 return _this._nativeProxy[propertyName];
            }
        },
        set: function(handler) {
            if (_this._activeProxy) {
                _this._activeProxy[eventPropertyName]= proxyProgressEventHandler(_this, eventName, handler);
            } else {
                _this._nativeProxy[eventPropertyName]= proxyProgressEventHandler(_this, eventName, handler);
                if (_this._corsProxy)
                    _this._corsProxy[eventPropertyName]= proxyProgressEventHandler(_this, eventName, handler);
            }
        }
    };
    Object.defineProperty(_this, eventPropertyName, descriptor);
}

var nativeXHR = window.XMLHttpRequest;
function chromeXHR() {
    var that=this;
    this._nativeProxy = new nativeXHR();
    this._corsProxy = window.corsXMLHttpRequest && new window.corsXMLHttpRequest();
    this._activeProxy = null;
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
                this._nativeProxy.responseType = 'arraybuffer';
                if (this._corsProxy) this._corsProxy.responseType = 'arraybuffer';
                this._overrideResponseType = 'blob';
            } else {
                this._nativeProxy.responseType = val;
                if (this._corsProxy) this._corsProxy.responseType = val;
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
    if (this._corsProxy && url.indexOf('http') == 0) {
        this._activeProxy = this._corsProxy;
    } else {
        this._activeProxy = this._nativeProxy;
    }
    this._activeProxy.open.apply(this._activeProxy, arguments);
};

exports.XMLHttpRequest = chromeXHR;
