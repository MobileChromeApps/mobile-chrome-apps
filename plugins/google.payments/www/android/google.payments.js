// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var exec = require('cordova/exec'),
    Event = require('org.chromium.common.events'),
    billingAvailable;

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
errorTypes[ITEM_ALREADY_OWNED] = "ITEM_ALREADY_OWNED";
errorTypes[ITEM_NOT_OWNED] = "ITEM_NOT_OWNED";
errorTypes[USER_CANCELLED] = "PURCHASE_CANCELLED";
    
exports.onBillingAvailable = new Event('onBillingAvailable');
exports.onBillingUnavailable = new Event('onBillingUnavailable');
exports.billingAvailable = false;
exports.inapp = {
    getSkuDetails: function(skus, success, failure) {
        if (!(skus instanceof Array)) {
            skus = [skus];
        }
        exec(success, failure, "InAppBillingV3", "getSkuDetails", skus);
    },

    getPurchases: function(success, failure) {
        exec(success, failure, "InAppBillingV3", "getPurchases", []);
    },

    getAvailableProducts: function(success, failure) {
        exec(success, failure, "InAppBillingV3", "getAvailableProducts", []);
    },

    buy: function(options) {
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
                        code: err.code,
                        message: err.message
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
        console.log("Billing initialized");
        exports.billingAvailable = true;
        exports.onBillingAvailable.fire();
    }, function() {
        console.log("Error initializing billing");
        exports.billingAvailable = false;
        exports.onBillingUnavailable.fire();
    }, "InAppBillingV3", "init", []);
});
