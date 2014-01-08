// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var exec = require('cordova/exec'),
    iab = require('cc.fovea.plugins.inapppurchase.InAppPurchase'),
    Event = require('org.chromium.common.events'),
    billingAvailable;

exports.onBillingAvailable = new Event('onBillingAvailable');
exports.onBillingUnavailable = new Event('onBillingUnavailable');
exports.billingAvailable = true;
 
document.addEventListener('deviceready', function() {
    // Initialize listeners.
    window.storekit.init({
        debug: true, /* Because we like to see logs on the console */

        purchase: function (transactionId, productId) {
            console.log('purchased: ' + productId);
        },
        restore: function (transactionId, productId) {
            console.log('restored: ' + productId);
        },
        restoreCompleted: function () {
           console.log('all restore complete');
        },
        restoreFailed: function (errCode) {
            console.log('restore failed: ' + errCode);
        },
        error: function (errno, errtext) {
            console.log('Failed: ' + errtext);
        },
        ready: function () {
            var productIds = [
                "com.google.mcaspec.knowledgeofcake", 
                "com.google.mcaspec.physicalediblecake"
            ];
            window.storekit.load(productIds, function(validProducts, invalidProductIds) {
                validProducts.forEach(function(val) {
                    console.log("id: " + val.id + " title: " + val.title + " val: " + val.description + " price: " + val.price);
                });
                if(invalidProductIds.length) {
                    console.log("Invalid Product IDs: " + JSON.stringify(invalidProductIds));
                }
            });
        }
    });
});

exports.inapp = {
    getSkuDetails: function(skus, success, failure) {
        console.log('getSkuDetails');
    },

    getPurchases: function(success, failure) {
        console.log('getPurchases');
    },

    buy: function(options) {
        console.log('buy');
        window.storekit.options.purchase = function(transactionId, productId) {
            options.success();
        };
        window.storekit.purchase(options.sku, 1);
    }
};

