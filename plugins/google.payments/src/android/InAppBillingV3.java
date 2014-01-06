// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package com.google.payments;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Scanner;
import java.util.concurrent.atomic.AtomicInteger;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaWebView;

import com.google.payments.IabHelper.OnConsumeFinishedListener;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class InAppBillingV3 extends CordovaPlugin {

	protected static final String TAG = "google.payments";

	public static final int OK = 0;
	public static final int INVALID_ARGUMENTS = -1;
	public static final int UNABLE_TO_INITIALIZE = -2;
	public static final int BILLING_NOT_INITIALIZED = -3;
	public static final int UNKNOWN_ERROR = -4;
	public static final int USER_CANCELLED = -5;
	public static final int BAD_RESPONSE_FROM_SERVER = -6;
	public static final int VERIFICATION_FAILED = -7;
	public static final int ITEM_UNAVAILABLE = -8;
	public static final int ITEM_ALREADY_OWNED = -9;
	public static final int ITEM_NOT_OWNED = -10;
	public static final int CONSUME_FAILED = -11;

	private IabHelper iabHelper = null;
	boolean billingInitialized = false;
	AtomicInteger orderSerial = new AtomicInteger(0);

	private HashMap<String, Purchase> purchaseMap = new HashMap<String, Purchase>();

	private JSONObject manifestObject = null;

	private JSONObject getManifestContents() {
		if (manifestObject != null) return manifestObject;

		Context context = this.cordova.getActivity();
		InputStream is;
		try {
			is = context.getAssets().open("www/manifest.json");
			Scanner s = new Scanner(is).useDelimiter("\\A");
			String manifestString = s.hasNext() ? s.next() : "";
			manifestObject = new JSONObject(manifestString);
		} catch (IOException e) {
			Log.d(TAG, "Unable to read manifest file:" + e.toString());
			manifestObject = null;
		} catch (JSONException e) {
			Log.d(TAG, "Unable to parse manifest file:" + e.toString());
			manifestObject = null;
		}
		return manifestObject;
	}

	protected String getBase64EncodedPublicKey() {
		JSONObject manifestObject = getManifestContents();
		if (manifestObject != null) {
			return manifestObject.optString("play_store_key");
		}
		return null;
	}

	protected boolean shouldSkipPurchaseVerification() {
		JSONObject manifestObject = getManifestContents();
		if (manifestObject != null) {
			return manifestObject.optBoolean("skip_purchase_verification");
		}
		return false;
	}

	protected boolean initializeBillingHelper() {
		if (iabHelper != null) {
			Log.d(TAG, "Billing already initialized");
			return true;
		}
		Context context = this.cordova.getActivity();
		String base64EncodedPublicKey = getBase64EncodedPublicKey();
		boolean skipPurchaseVerification = shouldSkipPurchaseVerification();
		if (base64EncodedPublicKey != null) {
			iabHelper = new IabHelper(context, base64EncodedPublicKey);
			iabHelper.setSkipPurchaseVerification(skipPurchaseVerification);
			billingInitialized = false;
			return true;
		}
		Log.d(TAG, "Unable to initialize billing");
		return false;
	}

	@Override
	public void initialize(CordovaInterface cordova, CordovaWebView webView) {
		super.initialize(cordova, webView);
		initializeBillingHelper();
	}

	protected JSONObject makeError(int resultCode) {
		return makeError(resultCode, null, (JSONObject)null);
	}

	protected JSONObject makeError(int resultCode, String message) {
		return makeError(resultCode, message, (JSONObject)null);
	}

	protected JSONObject makeError(int resultCode, String message, IabResult result) {
		JSONObject extra = new JSONObject();
		try {
			extra.put("response", result.getResponse());
			extra.put("message", result.getMessage());
		} catch (JSONException e) {}
		return makeError(resultCode, message, extra);
	}

	protected JSONObject makeError(int resultCode, String message, JSONObject extra) {
		JSONObject error = new JSONObject();
		try {
			error.put("code", resultCode);
			if (message != null) {
				error.put("message", message);
			}
			if (extra != null) {
				error.put("extra", extra);
			}
		} catch (JSONException e) {}
		return error;
	}

	@Override
	public boolean execute(String action, final JSONArray args, final CallbackContext callbackContext) {
		if ("init".equals(action)) {
			return init(args, callbackContext);
		} else if ("buy".equals(action)) {
			return buy(args, callbackContext);
		} else if ("consumePurchase".equals(action)) {
			return consumePurchase(args, callbackContext);
		} else if ("getSkuDetails".equals(action)) {
			return getSkuDetails(args, callbackContext);
		}
		return false;
	}

	protected boolean init(final JSONArray args, final CallbackContext callbackContext) {
		if (billingInitialized == true) {
			Log.d(TAG, "Billing already initialized");
			callbackContext.success();
		}
		if (iabHelper == null) {
			Log.d(TAG, "Billing cannot be initialized");
			callbackContext.error(makeError(UNABLE_TO_INITIALIZE));
		}
		iabHelper.startSetup(new IabHelper.OnIabSetupFinishedListener() {
			public void onIabSetupFinished(IabResult result) {
				if (!result.isSuccess()) {
					Log.d(TAG, "Unable to initialize billing: " + result.toString());
					callbackContext.error(makeError(UNABLE_TO_INITIALIZE));
				} else {         
					Log.d(TAG, "Billing initialized");
					billingInitialized = true;
					callbackContext.success();
				}
			}
		});
		return true;
	}

	protected boolean buy(final JSONArray args, final CallbackContext callbackContext) {
		final String sku;
		try {
			sku = args.getString(0);
		} catch (JSONException e) {
			callbackContext.error(makeError(INVALID_ARGUMENTS, "Invalid SKU"));
			return false;
		}
		if (iabHelper == null || !billingInitialized) {
			Log.d(TAG, "Billing is not initialized");
			callbackContext.error(makeError(BILLING_NOT_INITIALIZED, "Billing is not initialized"));
			return false;
		}
		final Activity cordovaActivity = this.cordova.getActivity();
		int newOrder = orderSerial.getAndIncrement();
		this.cordova.setActivityResultCallback(this);
		iabHelper.launchPurchaseFlow(cordovaActivity, sku, newOrder, 
				new IabHelper.OnIabPurchaseFinishedListener() {
			public void onIabPurchaseFinished(IabResult result, Purchase purchase) {
				if (result.isFailure()) {
					// TODO: Add way more info to this
					int response = result.getResponse();
					if (response == IabHelper.IABHELPER_BAD_RESPONSE || response == IabHelper.IABHELPER_UNKNOWN_ERROR) {
						callbackContext.error(makeError(BAD_RESPONSE_FROM_SERVER, "Could not complete purchase", result));
					}
					if (response == IabHelper.IABHELPER_VERIFICATION_FAILED) {
						callbackContext.error(makeError(BAD_RESPONSE_FROM_SERVER, "Could not complete purchase", result));
					}
					if (response == IabHelper.IABHELPER_USER_CANCELLED) {
						callbackContext.error(makeError(USER_CANCELLED, "Purchase Cancelled", result));
					}
					callbackContext.error(makeError(UNKNOWN_ERROR, "Error completing purchase", result));
				} else {
					purchaseMap.put(purchase.getToken(), purchase);
					try {
						JSONObject pluginResponse = new JSONObject();
						pluginResponse.put("orderId", purchase.getOrderId());
						pluginResponse.put("productId", purchase.getSku());
						pluginResponse.put("purchaseToken", purchase.getToken());
						callbackContext.success(pluginResponse);
					} catch (JSONException e) {
						callbackContext.error("Purchase succeeded but success handler failed");
					}
				}
			}
		}, "");
		return true;
	}

	protected Purchase getPurchase(String purchaseToken) {
		return purchaseMap.get(purchaseToken);
	}

	protected boolean consumePurchase(final JSONArray args, final CallbackContext callbackContext) {
		final Purchase purchase;
		try {
			String purchaseToken = args.getString(0);
			purchase = getPurchase(purchaseToken);
		} catch (JSONException e) {
			callbackContext.error(makeError(INVALID_ARGUMENTS, "Unable to parse purchase token"));
			return false;
		}
		if (purchase == null) {
			callbackContext.error(makeError(INVALID_ARGUMENTS, "Unrecognized purchase token"));
			return false;
		}
		if (iabHelper == null || !billingInitialized) {
			Log.d(TAG, "Billing is not initialized");
			callbackContext.error(makeError(BILLING_NOT_INITIALIZED, "Billing is not initialized"));
			return false;
		}
		iabHelper.consumeAsync(purchase, new OnConsumeFinishedListener() {
			public void onConsumeFinished(Purchase purchase, IabResult result) {
				if (result.isFailure()) {
					// TODO: Add way more info to this
					callbackContext.error(makeError(CONSUME_FAILED, "Error consuming purchase", result));
				} else {
					try {
						JSONObject pluginResponse = new JSONObject();
						pluginResponse.put("orderId", purchase.getOrderId());
						callbackContext.success(pluginResponse);
					} catch (JSONException e) {
						callbackContext.error("Consume succeeded but success handler failed");
					}
				}
			}
		});
		return true;
	}

	protected boolean getSkuDetails(final JSONArray args, final CallbackContext callbackContext) {
		final List<String> moreSkus = new ArrayList<String>();
		try {
			for (int i = 0; i < args.length(); i++) {
				moreSkus.add(args.getString(i));
			}
		} catch (JSONException e) {
			callbackContext.error(makeError(INVALID_ARGUMENTS, "Invalid SKU"));
			return false;
		}
		if (iabHelper == null || !billingInitialized) {
			Log.d(TAG, "Billing is not initialized");
			callbackContext.error(makeError(BILLING_NOT_INITIALIZED, "Billing is not initialized"));
			return false;
		}
		iabHelper.queryInventoryAsync(true, moreSkus, new IabHelper.QueryInventoryFinishedListener() {
			public void onQueryInventoryFinished(IabResult result, Inventory inventory) {
				if (result.isFailure()) {
					callbackContext.error("Error retrieving SKU details");
					return;
				}
				JSONArray response = new JSONArray();
				try {
					for (String sku : moreSkus) {
						SkuDetails skuDetails = inventory.getSkuDetails(sku);
						if (skuDetails != null) {
							JSONObject detailsJson = new JSONObject();
							detailsJson.put("productId", skuDetails.getSku());
							detailsJson.put("title", skuDetails.getTitle());
							detailsJson.put("description", skuDetails.getDescription());
							detailsJson.put("price", skuDetails.getPrice());
							detailsJson.put("type", skuDetails.getType());
							response.put(detailsJson);
						}
					}
				} catch (JSONException e) {
					callbackContext.error(e.getMessage());
				}
				callbackContext.success(response);
			}
		});
		return true;
	}

	@Override
	public void onActivityResult(int requestCode, int resultCode, Intent intent) {
		if (!iabHelper.handleActivityResult(requestCode, resultCode, intent)) {
			super.onActivityResult(requestCode, resultCode, intent);
		}
	}


	@Override
	public void onDestroy() {
		if (iabHelper != null) iabHelper.dispose();
		iabHelper = null;
		billingInitialized = false;
	}
}
