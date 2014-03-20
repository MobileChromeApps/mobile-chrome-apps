// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import android.accounts.AccountManager;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import com.google.android.gms.auth.GoogleAuthUtil;
import com.google.android.gms.auth.UserRecoverableAuthException;
import com.google.android.gms.common.AccountPicker;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GooglePlayServicesUtil;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;

public class ChromeIdentity extends CordovaPlugin {
    private static final String LOG_TAG = "ChromeIdentity";

    // Error codes.
    private static final int ERROR_GOOGLE_PLAY_SERVICES_UNAVAILABLE = -1;

    // Intent request codes.
    private static final int REQUEST_CODE_ACCOUNT_CHOOSER = 1;
    private static final int REQUEST_CODE_PERMISSION_DIALOG = 2;

    // Cached arguments and callback.
    private CordovaArgs cachedCordovaArgs;
    private CallbackContext cachedCallbackContext;

    // The account currently authenticated (or being authenticated).
    private String cachedAccount;

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("getAccountAndAuthToken".equals(action)) {
            getAccountAndAuthToken(args, callbackContext);
            return true;
        }

        return false;
    }

    // API Functions

    private void getAccountAndAuthToken(final CordovaArgs args, final CallbackContext callbackContext) {
        // This function always launches the account chooser.
        this.cordova.getThreadPool().execute(new Runnable() {
            public void run() {
                launchAccountChooser(args, callbackContext);
            }
        });
    }

    // Helper Functions

    private void launchAccountChooser(CordovaArgs args, CallbackContext callbackContext) {
        // Check if Google Play Services is available.
        int availabilityCode = GooglePlayServicesUtil.isGooglePlayServicesAvailable(this.cordova.getActivity());
        if (availabilityCode == ConnectionResult.SUCCESS) {
            // Cache the arguments and the callback so we can use them when the intent is resolved.
            this.cachedCordovaArgs = args;
            this.cachedCallbackContext = callbackContext;

            // Show the account chooser.
            // Note that the "google.com" filter accepts both Google and Gmail accounts.
            Intent intent = AccountPicker.newChooseAccountIntent(null, null, new String[]{"com.google"}, false, null, null, null, null);
            this.cordova.startActivityForResult(this, intent, REQUEST_CODE_ACCOUNT_CHOOSER);
        } else {
            Log.e(LOG_TAG, "Google Play Services is unavailable.");
            callbackContext.error(ERROR_GOOGLE_PLAY_SERVICES_UNAVAILABLE);
            return;
        }
    }

    private void getAuthTokenForAccount(final CordovaArgs args, final CallbackContext callbackContext, final String account) {
        this.cordova.getThreadPool().execute(new Runnable() {
            public void run() {
                String token = "";

                try {
                    // Try to get a token.
                    Context context = cordova.getActivity();
                    String scopes = getScopesStringFromArgs(args);
                    token = GoogleAuthUtil.getToken(context, account, scopes);
                } catch (UserRecoverableAuthException e) {
                    // The user needs to grant permissions.
                    Intent permissionIntent = e.getIntent();
                    launchPermissionDialog(args, callbackContext, account, permissionIntent);
                    return;
                } catch (Exception e) {
                    Log.e(LOG_TAG, "Error occurred while getting token.", e);
                    return;
                }

                // If we haven't returned from a catch block, we have a token and can pass it to the callback.
                passTokenDataToCallback(callbackContext, account, token);
            }
        });
    }

    private String getScopesStringFromArgs(CordovaArgs args) throws IOException, JSONException {
        // The scope string is space-delimited.
        JSONArray scopes = args.getJSONObject(0).getJSONArray("scopes");
        StringBuilder ret = new StringBuilder("oauth2:");
        for (int i = 0; i < scopes.length(); i++) {
            if (i != 0) {
                ret.append(" ");
            }
            ret.append(scopes.getString(i));
        }
        return ret.toString();
    }

    private void launchPermissionDialog(CordovaArgs args, CallbackContext callbackContext, String account, Intent permissionIntent) {
        // Cache information so we can access it when the activity resolves.
        this.cachedCordovaArgs = args;
        this.cachedCallbackContext = callbackContext;
        this.cachedAccount = account;

        // Request permission.
        this.cordova.startActivityForResult(this, permissionIntent, REQUEST_CODE_PERMISSION_DIALOG);
    }

    private void passTokenDataToCallback(CallbackContext callbackContext, String account, String token) {
        try {
            JSONObject jsonObject = new JSONObject();

            // Add the account info.
            JSONObject accountInfo = new JSONObject();
            accountInfo.put("id", "NULL_ID");
            accountInfo.put("email", account);
            jsonObject.put("account", accountInfo);

            // Add the token.
            jsonObject.put("token", token);

            // Pass the results to the callback.
            callbackContext.success(jsonObject);
        } catch (JSONException e) { }
    }

    @Override
    public void onActivityResult(final int requestCode, final int resultCode, final Intent intent) {
        if (requestCode == REQUEST_CODE_ACCOUNT_CHOOSER) {
            if(resultCode == Activity.RESULT_OK && intent.hasExtra(AccountManager.KEY_ACCOUNT_NAME)) {
                // The user has chosen an account, so we can get an authentication token for that account.
                getAuthTokenForAccount(cachedCordovaArgs, cachedCallbackContext, intent.getStringExtra(AccountManager.KEY_ACCOUNT_NAME));
            } else {
                // The user has declined to choose an account.
                this.cachedCallbackContext.error("User declined to choose an account.");
            }
        } else if (requestCode == REQUEST_CODE_PERMISSION_DIALOG) {
            if (resultCode == Activity.RESULT_OK && intent.hasExtra(AccountManager.KEY_AUTHTOKEN)) {
                // The user has granted permissions, so we can return the auth token.
                passTokenDataToCallback(this.cachedCallbackContext, this.cachedAccount, intent.getStringExtra(AccountManager.KEY_AUTHTOKEN));
            } else {
                // Permissions were not granted.
                this.cachedCallbackContext.error("User declined to grant permissions.");
            }
        }

        // Clear cached information.
        this.cachedAccount = null;
        this.cachedCordovaArgs = null;
        this.cachedCallbackContext = null;
    }
}

