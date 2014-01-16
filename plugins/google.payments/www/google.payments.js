// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var Event = require('org.chromium.common.events');

var INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
    MERCHANT_ERROR = "MERCHANT_ERROR",
    PURCHASE_CANCELLED = "PURCHASE_CANCELLED";

function createError(errorType, errorCode, errorText, message) {
    return {
        response: {
            errorType: errorType,
            details: {
                errorCode: errorCode,
                errorText: errorText,
                message: message
            }
        }
    };
}

exports.onBillingAvailable = new Event('onBillingAvailable');
exports.onBillingUnavailable = new Event('onBillingUnavailable');
exports.billingAvailable = false;

exports.inapp = {
    platform: cordova.platformId,
    getSkuDetails: function(skus, success, failure) {
        var error = createError(INTERNAL_SERVER_ERROR, null, null, "getSkuDetails is not supported on this platform.");
        failure(error);
    },

    getPurchases: function(success, failure) {
        var error = createError(INTERNAL_SERVER_ERROR, null, null, "getPurchases is not supported on this platform.");
        failure(error);
    },

    buy: function(options) {
        // If billing is unavailable, throw an error.
        if (!exports.billingAvailable) {
            var error = createError(MERCHANT_ERROR, null, null, "Billing is unavailable.");
            options.failure(error);
        }

        // If no SKU is provided, throw an error.
        if (!options.sku) {
            var error = createError(MERCHANT_ERROR, null, null, "No SKU provided for purchase.");
            options.failure(error);
        }

        // Delegate to the platform-specific implementation.
        if (exports.inapp.platform === "android") {
            exports.inapp.buyAndroid(options);
        } else if (exports.inapp.platform === "ios") {
            exports.inapp.buyIos(options);
        } else {
            var error = createError(INTERNAL_SERVER_ERROR, null, null, "buy is not supported on this platform.");
            options.failure(error);
        }
    }
};

