# chrome.payments Plugin

This plugin allows you to sell digital and virtual goods within your app. It is built on the [Android In-App Billing API](http://developer.android.com/google/play/billing/index.html) and the [iOS In-App Purchase API](https://developer.apple.com/library/IOS/documentation/NetworkingInternet/Conceptual/StoreKitGuide/Introduction.html). It provides a JavaScript interface similar to the [Chrome Apps Google Wallet for Digital Goods API](http://developer.chrome.com/apps/google_wallet.html), so that you can use the same API in both a desktop and mobile Chrome App.

## Status

Beta on Android and iOS.

## Installation

To install in a mobile chrome app, add the string "payments" to your applications permissions list in manifest.json. The plugin will be installed the next time your app is built.

```
"permissions": ["payments"],
```

For Cordova apps, install with the cordova command-line tool:

    cordova plugin add com.google.payments

## Configuration

For iOS, no additional configuration is necessary.

For Android, you will need to add a key to your application's manifest file.

    "play_store_key": <Base64-encoded public key from the Google Play Store>

The required public key can be obtained from the Google Play Store once you have uploaded your app (it does not need to be published; just uploaded). From the "Services & APIs" panel for your app, copy the string labeled "Your license key for this application".

## Usage

### Determining When Billing is Available

Mobile applications are not guaranteed to have access to in-app billing services. Billing may be unavailable for many reasons, from misconfiguration to explicit denial: the owner of the device may not have a store account or may have removed in-app-purchase privileges for a guest or child's account.

Your app can inspect the `google.payments.isBillingAvailable` property to test whether billing services are available or not. You can also register a listener on the `google.payments.onBillingAvailabilityChanged` events to detect changes to billing availability. It is fired whenever `isBillingAvailable` changes.

In general, calls to the payments API will fail if `isBillingAvailable` is `false`.

### Purchasing Products

To initiate a purchase, call `google.payments.inapp.buy()`.

### Consumable Products

Both Android and iOS support the concept of "consumable" products. These products can be purchased multiple times, and are only associated with the device on which they were purchased.

One-time purchasable products, in contrast, can only be purchased once per user, and can be used on all devices. On Android, attempting to purchase a one-time purchasable product additional times will result in an error. On iOS, the user will be notified that the product has already been purchased.

On Android, any item may be purchased as a consumable item. The `buy()` method accepts a `consume` argument which indicates whether the item is to be consumed after purchase.

On iOS, consumability is set for each product in iTunes Connect.

## API Reference

### buy()

`google.payments.inapp.buy(<options>)`

`options` is an object with the following members:

- `sku`: The product id of the item to purchase

- `consume`: A boolean value indicating whether the purchased product is to be consumed

- `success`: Success callback

- `failure`: Failure callback

If the purchase is successful, `options.success` will be called with a `purchaseResult` as its single argument.

`purchaseResult` is an object with this structure:

    {
        "request": {
            "sku": <productId of item consumed>,
            "consume": <boolean consume from original request>
        },
        "response": {
            "orderId": <Unique order ID from the back-end store>
        }
    }

If the purchase fails for any reason (including cancellation), `options.failure` will be called with a `failureResult` as its single argument.

`failureResult` is an object with this structure:

    {
        "request": {
            "sku": <productId of item consumed>,
            "consume": <boolean consume from original request>
        },
        "response": {
            "errorType": <Error type, see below>,
            "details": {
                "message": <Explanatory text about where the error occurred>,
                "errorCode": <Error code, if available, from the back-end store>,
                "errorText": <Text associated with the error, if available, from the back-end store>
            }
        }
    }

`errorType` may be one of these values:

- `MERCHANT_ERROR`: The billing system is unavailable, or the the `buy()` arguments are incorrect.

- `PURCHASE_CANCELLED`: No error occurred, but the purchase was not completed. The purchaser cancelled the payment, or the payment was declined by the store.

- `INTERNAL_SERVER_ERROR`: An error occurred within the plugin or at the back-end store.

`errorCode` and `errorText` come from the back-end store when possible, and can be useful for troubleshooting purchasing issues. Their values depend on the store used, and so can't be fully enumerated here. See the appropriate store documentation for details.

### getSkuDetails()

`google.payments.inapp.getSkuDetails(<skuList>, <successCallback>, <failureCallback>)`

`skuList` is an array of productId strings to retrieve information about.

If successful, `successCallback` will be called with a `skuDetails` array. Every item in the array is an object like this:

    {
        "productId": <The SKU for this product>,
        "title": <The short title of the product>,
        "description": <The long description of the product>,
        "price": <The localised price for the product>,
        "type": <The store-specific type associated with the product>
    }

On failure, `failureCallback` will be called with a `failureResult` as its single argument (see above).

## External References

### Sample app
* [In-App Purchases Test App](https://github.com/MobileChromeApps/mobile-chrome-app-samples/tree/master/iaptest)

### API
* [Monetize your Chrome App](http://developer.chrome.com/apps/google_wallet.html)
* [Google Wallet for Digital Goods API](https://developers.google.com/wallet/digital/docs/jsreference)

### Back-end store references
* [Android BillingV3 documentation](http://developer.android.com/google/play/billing/api.html)
* [iOS In-App Purchase Programming Guide](https://developer.apple.com/library/IOS/documentation/NetworkingInternet/Conceptual/StoreKitGuide/Introduction.html)

## Notes

* Ad-hoc payments are currently unsupported.
* iOS does not support `getPurchases`.

# Release Notes
