// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var exec = require('cordova/exec'),
    iab = require('com.smartmobilesoftware.inappbilling.InAppBillingPlugin'),
    Event = require('org.chromium.common.events'),
    billingAvailable;

exports.onBillingAvailable = new Event('onBillingAvailable');
exports.onBillingUnavailable = new Event('onBillingUnavailable');
exports.billingAvailable = false;
exports.inapp = {
    getSkuDetails: function(skus, success, failure) {
        if (!(skus instanceof Array)) {
            skus = [skus];
        }
        iab.getProductDetails(success, failure, skus);
    },

    getPurchases: function(success, failure) {
        iab.getPurchases(success, failure);
    },

    getAvailableProducts: function(success, failure) {
        iab.getAvailableProducts(success, failure);
    },

    buy: function(options) {
        var purchaseSuccess = function(purchaseDetails) {
                var result = {
                    request: {},
                    response: {
                        orderId: purchaseDetails.orderId
                    }
                };
                options.success(result);
            },
            purchaseConsumableSuccess = function(purchaseDetails) {
                    //iab.consumePurchase(purchaseSuccess, failure, purchaseDetails.purchaseToken);
                    iab.consumePurchase(purchaseSuccess, failure, purchaseDetails.sku);
            };

            failure = function(err) {
                var errorType = "INTERNAL_SERVER_ERROR";
                if (err.code === 7) {
                    errorType = "ITEM_ALREADY_OWNED";
                }
                if (err.code === -1005) {
                    errorType = "PURCHASE_CANCELLED";
                }
                var result = {
                    response: {
                        errorType: errorType
                    }
                };
                options.failure(result);
            };
        if ('sku' in options) {
            if (options.consume) {
                iab.buy(purchaseConsumableSuccess, failure, options.sku);
            } else {
                iab.buy(purchaseSuccess, failure, options.sku);
            }
        }
    }
};

iab.init(function() {
    console.log("Billing initialized");
    exports.billingAvailable = true;
    exports.onBillingAvailable.fire();
}, function() {
    console.log("Error initializing billing");
    exports.billingAvailable = false;
    exports.onBillingUnavailable.fire();
}, {showLog: true});
