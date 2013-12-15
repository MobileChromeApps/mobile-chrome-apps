// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

exports.inapp = {
    platform: cordova.platformId,
    getSkuDetails: function(skus, success, failure) {
        throw new Error("In App Purchase not implemented on this platform");
    },

    getPurchases: function(success, failure) {
        throw new Error("In App Purchase not implemented on this platform");
    },

    buy: function(options) {
        throw new Error("In App Purchase not implemented on this platform");
    }
};
