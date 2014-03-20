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
    private static final int ERROR_GENERAL = -1;
    private static final int ERROR_GOOGLE_PLAY_SERVICES_UNAVAILABLE = -2;
    private static final int ERROR_ACCOUNT_SELECTION_DECLINED = -3;
    private static final int ERROR_PERMISSION_NOT_GRANTED = -4;
    private static final int ERROR_INVALID_ARGUMENTS = -5;
    private static final int ERROR_INTERACTION_REQUIRED_FOR_ACCOUNT_SELECTION = -6;
    private static final int ERROR_INTERACTION_REQUIRED_FOR_PERMISSION = -7;

    // Intent request codes.
    private static final int REQUEST_CODE_ACCOUNT_CHOOSER = 1;
    private static final int REQUEST_CODE_PERMISSION_DIALOG = 2;

    // Cached arguments and callback.
    private CordovaArgs cachedCordovaArgs;
    private CallbackContext cachedCallbackContext;

    // The account currently authenticated (or being authenticated).
    private String cachedAccount;

    // This determines whether to return token data (including the account) or just the token.
    private boolean tokenOnly;

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("getAccountAndAuthToken".equals(action)) {
            getAccountAndAuthToken(args, callbackContext);
            return true;
        } else if ("getAuthToken".equals(action)) {
            getAuthToken(args, callbackContext);
            return true;
        }

        return false;
    }

    // API Functions

    private void getAccountAndAuthToken(final CordovaArgs args, final CallbackContext callbackContext) {
        // When this is called, we want to return the selected account, not just the token.
        this.tokenOnly = false;

        // This function always launches the account chooser.
        this.cordova.getThreadPool().execute(new Runnable() {
            public void run() {
                launchAccountChooser(args, callbackContext);
            }
        });
    }

    private void getAuthToken(final CordovaArgs args, final CallbackContext callbackContext) {
        // When this is called, we just want to return the token.
        this.tokenOnly = true;

        boolean interactive = false;
        String account = null;

        try {
            interactive = args.getBoolean(1);
            account = args.getString(2);
        } catch (JSONException e) { }

        if (account != null) {
            // Account cannot be specified with interactive mode.
            // Note that this should be caught in JavaScript.
            if (interactive) {
                Log.e(LOG_TAG, "User account can only be specified in non-interactive mode.");
                callbackContext.error(ERROR_INVALID_ARGUMENTS);
                return;
            }

            // We have an account, so try to get a token.
            getAuthTokenForAccount(args, callbackContext, account);
        } else {
            // We don't have an account, so we need to ask the user to choose one.
            if (interactive) {
                this.cordova.getThreadPool().execute(new Runnable() {
                    public void run() {
                        launchAccountChooser(args, callbackContext);
                    }
                });
            } else {
                // We can't ask for an account if we're not in interactive mode.
                Log.e(LOG_TAG, "User interaction is required in order to obtain an account.");
                callbackContext.error(ERROR_INTERACTION_REQUIRED_FOR_ACCOUNT_SELECTION);
                return;
            }
        }
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
                    // This can only be done in interactive mode.
                    boolean interactive = false;
                    try {
                        interactive = args.getBoolean(1);
                    } catch (JSONException jsonException) { }
                    if (interactive) {
                        Intent permissionIntent = e.getIntent();
                        launchPermissionDialog(args, callbackContext, account, permissionIntent);
                        return;
                    } else {
                        Log.e(LOG_TAG, "User interaction is required in order to obtain permission.", e);
                        callbackContext.error(ERROR_INTERACTION_REQUIRED_FOR_PERMISSION);
                        return;
                    }
                } catch (Exception e) {
                    Log.e(LOG_TAG, "Error occurred while getting token.", e);
                    callbackContext.error(ERROR_GENERAL);
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
            JSONObject tokenData = new JSONObject();
            if (this.tokenOnly) {
                // We're cheating.  For caching purposes, we also pass the account email.
                tokenData.put("account", account);
                tokenData.put("token", token);
            } else {
                // Add the account info.
                JSONObject accountInfo = new JSONObject();
                accountInfo.put("id", "NULL_ID");
                accountInfo.put("email", account);
                tokenData.put("account", accountInfo);

                // Add the token.
                tokenData.put("token", token);
            }

            // Pass the token data to the callback.
            callbackContext.success(tokenData);
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
                Log.e(LOG_TAG, "User declined to choose an account.");
                this.cachedCallbackContext.error(ERROR_ACCOUNT_SELECTION_DECLINED);
            }
        } else if (requestCode == REQUEST_CODE_PERMISSION_DIALOG) {
            if (resultCode == Activity.RESULT_OK && intent.hasExtra(AccountManager.KEY_AUTHTOKEN)) {
                // The user has granted permissions, so we can return the auth token.
                passTokenDataToCallback(this.cachedCallbackContext, this.cachedAccount, intent.getStringExtra(AccountManager.KEY_AUTHTOKEN));
            } else {
                // Permissions were not granted.
                Log.e(LOG_TAG, "User declined to grant permissions.");
                this.cachedCallbackContext.error(ERROR_PERMISSION_NOT_GRANTED);
            }
        }

        // Clear cached information.
        this.cachedAccount = null;
        this.cachedCordovaArgs = null;
        this.cachedCallbackContext = null;
    }
}

