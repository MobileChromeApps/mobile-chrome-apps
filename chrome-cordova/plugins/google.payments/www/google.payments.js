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
                /* The internal error code, if any, from the underlying store */
                errorCode: errorCode,
                /* The text associated with the error from the underlying store */
                errorText: errorText,
                /* Explanatory message about where and when the error occurred */
                message: message
            }
        }
    };
}

exports.onBillingAvailabilityChanged = new Event('onBillingAvailabilityChanged');
exports.billingAvailable = false;

exports.inapp = {
    getSkuDetails: function(options) {
        var error;
        var skus;

        // If billing is unavailable, throw an error.
        if (!exports.billingAvailable) {
            error = createError(MERCHANT_ERROR, null, null, "Billing is unavailable.");
            if (options.failure) options.failure(error);
        }

        // Build SKU list for query
        skus = options.skuList || [];
        if (options.sku) {
            skus.push(options.sku);
        }
        // If no SKUs are provided, throw an error.
        if (!skus.length) {
            error = createError(MERCHANT_ERROR, null, null, "No SKU provided for query.");
            if (options.failure) options.failure(error);
        }

        // Delegate to the platform-specific implementation.
        if (exports.inapp.getSkuDetailsInternal) {
            exports.inapp.getSkuDetailsInternal(skus, options.success, options.failure);
        } else {
            error = createError(INTERNAL_SERVER_ERROR, null, null, "getSkuDetails is not supported on this platform.");
            if (options.failure) options.failure(error);
        }
    },

    getPurchases: function(success, failure) {
        var error = createError(INTERNAL_SERVER_ERROR, null, null, "getPurchases is not supported on this platform.");
        failure(error);
    },

    buy: function(options) {
        var error;
        // If billing is unavailable, throw an error.
        if (!exports.billingAvailable) {
            error = createError(MERCHANT_ERROR, null, null, "Billing is unavailable.");
            options.failure(error);
        }

        // If no SKU is provided, throw an error.
        if (!options.sku) {
            error = createError(MERCHANT_ERROR, null, null, "No SKU provided for purchase.");
            options.failure(error);
        }

        // Delegate to the platform-specific implementation.
        if (exports.inapp.buyInternal) {
            exports.inapp.buyInternal(options);
        } else {
            error = createError(INTERNAL_SERVER_ERROR, null, null, "buy is not supported on this platform.");
            options.failure(error);
        }
    }
};

