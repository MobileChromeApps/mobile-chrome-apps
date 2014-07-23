// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var exec = require('cordova/exec');

// Return code constants
var OK = 0,
    INVALID_ARGUMENTS = -1,
    UNABLE_TO_INITIALIZE = -2,
    BILLING_NOT_INITIALIZED = -3,
    UNKNOWN_ERROR = -4,
    USER_CANCELLED = -5,
    BAD_RESPONSE_FROM_SERVER = -6,
    VERIFICATION_FAILED = -7,
    ITEM_UNAVAILABLE = -8,
    ITEM_ALREADY_OWNED = -9,
    ITEM_NOT_OWNED = -10,
    CONSUME_FAILED = -11;
var errorTypes = {};
errorTypes[ITEM_ALREADY_OWNED] = "MERCHANT_ERROR";
errorTypes[ITEM_NOT_OWNED] = "INTERNAL_SERVER_ERROR";
errorTypes[USER_CANCELLED] = "PURCHASE_CANCELLED";
errorTypes[UNKNOWN_ERROR] = "INTERNAL_SERVER_ERROR";
errorTypes[VERIFICATION_FAILED] = "INTERNAL_SERVER_ERROR";
errorTypes[ITEM_UNAVAILABLE] = "INTERNAL_SERVER_ERROR";

exports.inapp = {
    platform: 'android-play-store',
    getSkuDetailsInternal: function(skus, success, failure) {
        exec(success, failure, "InAppBillingV3", "getSkuDetails", skus);
    },

    getPurchases: function(success, failure) {
        exec(success, failure, "InAppBillingV3", "getPurchases", []);
    },

    getAvailableProducts: function(success, failure) {
        exec(success, failure, "InAppBillingV3", "getAvailableProducts", []);
    },

    buyInternal: function(options) {
        var purchaseSuccess = function(purchaseDetails) {
                var result = {
                    request: {
                        sku: purchaseDetails.productId
                    },
                    response: {
                        orderId: purchaseDetails.orderId,
                        purchaseToken: purchaseDetails.purchaseToken
                    }
                };
                options.success(result);
            },
            purchaseConsumableSuccess = function(purchaseDetails) {
                exec(options.success, failure, "InAppBillingV3", "consumePurchase", [purchaseDetails.purchaseToken]);
            },

            failure = function(err) {
                var result = {
                    response: {
                        errorType: errorTypes[err.code] || "UNKNOWN_ERROR",
                        details: {
                            /* Explanatory message about where and when the error occurred */
                            message: err.message,
                            /* The internal error code, if any, from the underlying store */
                            errorCode: err.code,
                            /* The text associated with the error from the underlying store */
                            errorText: err.text
                        }
                    }
                };
                options.failure(result);
            };

        if ('sku' in options) {
            if (options.consume) {
                exec(purchaseConsumableSuccess, failure, "InAppBillingV3", "buy", [options.sku]);
            } else {
                exec(purchaseSuccess, failure, "InAppBillingV3", "buy", [options.sku]);
            }
        }
    }
};

document.addEventListener('deviceready', function(ev) {
    exec(function() {
        console.log("Billing initialized.");
        google.payments.billingAvailable = true;
        google.payments.onBillingAvailabilityChanged.fire();
    }, function() {
        console.log("Error initializing billing.");
        google.payments.billingAvailable = false;
        google.payments.onBillingAvailabilityChanged.fire();
    }, "InAppBillingV3", "init", []);
});

