// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var Event = require('org.chromium.common.events');

exports.onBillingAvailable = new Event('onBillingAvailable');
exports.onBillingUnavailable = new Event('onBillingUnavailable');
exports.billingAvailable = false;

exports.inapp = {
    platform: cordova.platformId,
    getSkuDetails: function(skus, success, failure) {
        throw new Error("getSkuDetails is not supported on this platform.");
    },

    getPurchases: function(success, failure) {
        throw new Error("getPurchases is not supported on this platform.");
    },

    buy: function(options) {
        // If billing is unavailable, throw an error.
        if (!exports.billingAvailable) {
            var error = {
                response: {
                    errorType: "MERCHANT_ERROR",
                    details: {
                        message: "Billing is unavailable."
                    }
                }
            };
            options.failure(error);
        }

        // If no SKU is provided, throw an error.
        if (!options.sku) {
            var error = {
                response: {
                    errorType: "MERCHANT_ERROR",
                    details: {
                        message: "No SKU provided for purchase."
                    }
                }
            };
            options.failure(error);
        }

        // Delegate to the platform-specific implementation.
        if (exports.inapp.platform === "android") {
            exports.inapp.buyAndroid(options);
        } else if (exports.inapp.platform === "ios") {
            exports.inapp.buyIos(options);
        } else {
            throw new Error("buy is not supported on this platform.");
        }
    }
};

