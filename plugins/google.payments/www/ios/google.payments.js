// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var exec = require('cordova/exec'),
    iab = require('cc.fovea.plugins.inapppurchase.InAppPurchase');

// TODO(maxw): Put these (and the createError function) in one place.
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

// TODO(maxw): Consider storing this in local storage and preloading all previously-loaded items.
var loadedItemSet = {};

exports.inapp = {
    platform: 'ios-app-store',
    getSkuDetails: function(skus, success, failure) {
        // Load the products to retrieve their information.
        window.storekit.load(skus, function(validProducts, invalidProductIds) {
            // Record the data for each valid product.
            var skuDetails = [];
            if (validProducts.length) {
                validProducts.forEach(function (i, product) {
                    // Add the valid product to the set of loaded items.
                    loadedItemSet[product.id] = true;
                    console.log("Loaded product: " + product.id);

                    // Add the item details to the list.
                    var item = {};
                    item.productId = product.id;
                    item.title = product.title
                    item.description = product.description;
                    item.price = product.price;
                    item.type = 0;
                    skuDetails.push(item);
                });
            }
            // Log all invalid products.
            if (invalidProductIds.length) {
                invalidProductIds.forEach(function (i, val) {
                    console.log("Invalid product id: " + val);
                });
            }
            // Pass the valid product details to the success callback.
            success(skuDetails);
        });
    },

    buyInternal: function(options) {
        // We need to record whether the product to buy is valid.
        // This will be set to false if it's discovered that the given sku is invalid.
        var isValidProduct = true;

        // This function actually purchases the item.
        var purchaseItem = function() {
            // If the product is valid, buy it!
            if (isValidProduct) {
                // Set the purchase callback.
                window.storekit.options.purchase = function(transactionId, productId) {
                    options.success();
                };

                // Set the error callback.
                // TODO(maxw): Change this back to a default?
                window.storekit.options.error = function(errorCode, errorText) {
                    var error = createError(PURCHASE_CANCELLED, errorCode, errorText, "The purchase has failed or been cancelled.");
                    options.failure(error);
                };

                // Purchase the item!
                window.storekit.purchase(options.sku, 1);
            }
        }

        // First, we may need to load the item from the Apple Store.
        var sku = options.sku;
        if (!Object.prototype.hasOwnProperty.call(loadedItemSet, sku)) {
            var productIds = [sku];
            window.storekit.load(productIds, function(validProducts, invalidProductIds) {
                // If the product is valid, add it to the set of loaded items and purchase it.
                if (validProducts.length) {
                    loadedItemSet[sku] = true;
                    console.log("Loaded product: " + validProducts[0].id);
                    purchaseItem();
                }
                // If the product is invalid, note that.
                if (invalidProductIds.length) {
                    isValidProduct = false;
                    console.log("Invalid product: " + invalidProductIds[0]);
                }
            });
        } else {
            // If the item has already been previously loaded, we're safe to purchase it.
            purchaseItem();
        }
    }
};

document.addEventListener('deviceready', function(ev) {
    // Initialize StoreKit.
    window.storekit.init({
        debug: true,
        purchase: function(transactionId, productId) {
            console.log('Purchased: ' + productId);
        },
        restore: function(transactionId, productId) {
            console.log('Restored: ' + productId);
        },
        restoreCompleted: function() {
           console.log('All restores complete.');
        },
        restoreFailed: function(errCode) {
            console.log('Restore failed with error: ' + errCode);
        },
        error: function(errno, errtext) {
            // TODO(maxw): Convert these errors into general errors (eg. MERCHANT_ERROR, INTERNAL_SERVER_ERROR).
            console.log('Error: ' + errtext);
        },
        ready: function() {
            console.log("Billing initialized");
            google.payments.billingAvailable = true;
            google.payments.onBillingAvailabilityChanged.fire();
        }
    });
});

