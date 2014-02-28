// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

try {
    new Blob([]);
} catch (e) {
    var nativeBlob = window.Blob;
    var newBlob = function(parts, options) {
        if (window.WebKitBlobBuilder) {
            var bb = new WebKitBlobBuilder();
            if (parts && parts.length) {
                for (var i=0; i < parts.length; i++) {
                    bb.append(parts[i]);
                }
            }
            if (options && options.type) {
                return bb.getBlob(options.type);
            }
            return bb.getBlob();
        }
    }
    newBlob.prototype = nativeBlob.prototype
    exports.Blob = newBlob;
}
