// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var exec = require('cordova/exec'),
    iab = require('com.smartmobilesoftware.inappbilling.InAppBillingPlugin'),
    billingAvailable;

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

    buy: function(options) {
        var success = function(productId) {
                var result = {
                };
                options.success(result);
            },
            failure = function(err) {
                var result = {
                    response: {
                        errorType: "INTERNAL_SERVER_ERROR"
                    }
                };
                options.failure(result);
            };
        if ('sku' in options) {
            iab.buy(success, failure, options.sku);
        }
    }
};

iab.init(function() {
    console.log("Billing initialized");
    billingAvailable = true;
}, function() {
    console.log("Error initializing billing");
    billingAvailable = false;
}, {showLog: true});
