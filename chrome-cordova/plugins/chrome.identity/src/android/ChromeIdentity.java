// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import java.io.IOException;

import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.accounts.Account;
import android.accounts.AccountManager;
import android.app.Activity;
import android.app.Dialog;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import com.google.android.gms.auth.GoogleAuthException;
import com.google.android.gms.auth.GoogleAuthUtil;
import com.google.android.gms.auth.GooglePlayServicesAvailabilityException;
import com.google.android.gms.auth.UserRecoverableAuthException;
import com.google.android.gms.common.AccountPicker;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GooglePlayServicesUtil;

public class ChromeIdentity extends CordovaPlugin {

    private static final String LOG_TAG = "ChromeIdentity";

    // These are just unique request codes. They can be anything as long as they don't clash.
    private static final int AUTH_REQUEST_CODE = 5;
    private static final int ACCOUNT_CHOOSER_INTENT = 6;
    private static final int OAUTH_PERMISSIONS_GRANT_INTENT = 7;
    private static final int UPDATE_GOOGLE_PLAY_SERVICES_REQUEST_CODE = 8;

    // Error codes.
    private static final int GOOGLE_PLAY_SERVICES_UNAVAILABLE = -1;

    private String accountName = "";
    private CordovaArgs savedCordovaArgs;
    private CallbackContext savedCallbackContext;
    private boolean savedContent = false;

    private class TokenDetails {
        private boolean interactive;
    }

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("getAuthToken".equals(action)) {
            getAuthToken(args, callbackContext);
            return true;
        } else if ("removeCachedAuthToken".equals(action)) {
            removeCachedAuthToken(args, callbackContext);
            return true;
        } else if ("getAccounts".equals(action)) {
            getAccounts(args, callbackContext);
            return true;
        }

        return false;
    }

    private String getScopesString(CordovaArgs args) throws IOException, JSONException {
        JSONArray scopes = args.getJSONObject(1).getJSONArray("scopes");
        StringBuilder ret = new StringBuilder("oauth2:");

        for (int i = 0; i < scopes.length(); i++) {
            if (i != 0) {
                ret.append(" ");
            }
            ret.append(scopes.getString(i));
        }
        return ret.toString();
    }

    private TokenDetails getTokenDetailsFromArgs(CordovaArgs args) throws JSONException {
        TokenDetails tokenDetails = new TokenDetails();
        tokenDetails.interactive = args.getBoolean(0);
        return tokenDetails;
    }

    private boolean haveAccount() {
        return !(accountName.isEmpty());
    }

    private void launchAccountChooserAndCallback(CordovaArgs cordovaArgsToSave, CallbackContext callbackContextToSave) {
        // Check if Google Play Services is available.
        int availabilityCode = GooglePlayServicesUtil.isGooglePlayServicesAvailable(this.cordova.getActivity());
        if (availabilityCode == ConnectionResult.SUCCESS) {
            this.savedCordovaArgs = cordovaArgsToSave;
            this.savedCallbackContext = callbackContextToSave;
            this.savedContent = true;

            // The "google.com" filter accepts both Google and Gmail accounts.
            Intent intent = AccountPicker.newChooseAccountIntent(null, null, new String[]{"com.google"}, false, null, null, null, null);
            this.cordova.startActivityForResult(this, intent, ACCOUNT_CHOOSER_INTENT);
        } else if (availabilityCode == ConnectionResult.SERVICE_VERSION_UPDATE_REQUIRED) {
            // Save our data.
            this.savedCordovaArgs = cordovaArgsToSave;
            this.savedCallbackContext = callbackContextToSave;
            this.savedContent = true;

            // Prompt the user to update Google Play Services.
            GooglePlayServicesUtil.getErrorDialog(availabilityCode, this.cordova.getActivity(), UPDATE_GOOGLE_PLAY_SERVICES_REQUEST_CODE).show();
        } else {
            // Fall back to the web auth flow.
            callbackContextToSave.error(GOOGLE_PLAY_SERVICES_UNAVAILABLE);
        }
    }

    private void launchPermissionsGrantPageAndCallback(Intent permissionsIntent, CordovaArgs cordovaArgsToSave, CallbackContext callbackContextToSave) {
        this.savedCallbackContext = callbackContextToSave;
        this.savedCordovaArgs = cordovaArgsToSave;
        this.savedContent  = true;
        this.cordova.startActivityForResult(this, permissionsIntent, OAUTH_PERMISSIONS_GRANT_INTENT);
    }

    @Override
    public void onActivityResult(final int requestCode, final int resultCode, final Intent intent) {
        // Enter only if we have requests waiting
        if (savedContent) {
            if (requestCode == ACCOUNT_CHOOSER_INTENT) {
                if (resultCode == Activity.RESULT_OK && intent.hasExtra(AccountManager.KEY_ACCOUNT_NAME)) {
                    accountName = intent.getStringExtra(AccountManager.KEY_ACCOUNT_NAME);
                    getAuthToken(this.savedCordovaArgs, this.savedCallbackContext);
                } else {
                    this.savedCallbackContext.error("User declined to provide an account");
                }
                this.savedContent = false;
                this.savedCallbackContext = null;
                this.savedCordovaArgs = null;
            } else if (requestCode == OAUTH_PERMISSIONS_GRANT_INTENT) {
                cordova.getThreadPool().execute(new Runnable() {
                    @Override
                    public void run() {
                        if (resultCode == Activity.RESULT_OK) {
                            String token = null;
                            if (intent.hasExtra("authtoken")) {
                                token = intent.getStringExtra("authtoken");
                            } else {
                                try {
                                    token = GoogleAuthUtil.getToken(cordova.getActivity(), intent.getExtras().getString("authAccount"), intent.getExtras().getString("service"));
                                } catch (UserRecoverableAuthException e) {
                                    e.printStackTrace();
                                    savedCallbackContext.error("Auth Error: " + e.getMessage());
                                    return;
                                } catch (IOException e) {
                                    e.printStackTrace();
                                    savedCallbackContext.error("Auth Error: " + e.getMessage());
                                    return;
                                } catch (GoogleAuthException e) {
                                    e.printStackTrace();
                                    savedCallbackContext.error("Auth Error: " + e.getMessage());
                                    return;
                                }
                            }
                            if (token == null) {
                                savedCallbackContext.error("Unknown auth error.");
                            } else {
                                getAuthTokenCallback(token, savedCallbackContext);
                            }
                        } else {
                            savedCallbackContext.error("User did not approve oAuth permissions request");
                        }
                        savedContent = false;
                        savedCallbackContext = null;
                        savedCordovaArgs = null;
                    }
                });
            } else if (requestCode == UPDATE_GOOGLE_PLAY_SERVICES_REQUEST_CODE) {
                if (resultCode == Activity.RESULT_OK) {
                    // The user has updated Google Play Services.  Try again!
                    launchAccountChooserAndCallback(savedCordovaArgs, savedCallbackContext);
                } else {
                    // Google Play Services was not updated.
                    savedCallbackContext.error("Google Play Services is out of date.");

                    savedContent = false;
                    savedCallbackContext = null;
                    savedCordovaArgs = null;
                }
            }
        }
    }

    private void getAuthToken(final CordovaArgs args, final CallbackContext callbackContext) {
        this.cordova.getThreadPool().execute(new Runnable() {
            public void run() {
                if(!haveAccount()) {
                    String accountHint = null;
                    try {
                        accountHint = args.getString(2);
                    } catch (JSONException e) { }
                    if (accountHint != null) {
                        accountName = accountHint;
                        getAuthTokenWithAccount(accountName, args, callbackContext);
                    } else {
                        launchAccountChooserAndCallback(args, callbackContext);
                    }
                } else {
                    getAuthTokenWithAccount(accountName, args, callbackContext);
                }
            }
        });
    }

    private void getAuthTokenWithAccount(String account, CordovaArgs args, CallbackContext callbackContext) {
        String token = "";
        String scope = "";
        Context context = null;
        boolean done = true;
        TokenDetails tokenDetails = null;

        try {
            tokenDetails = getTokenDetailsFromArgs(args);
            scope = getScopesString(args);
            context = this.cordova.getActivity();
            token = GoogleAuthUtil.getToken(context, account, scope);
        } catch (GooglePlayServicesAvailabilityException playEx) {
            // Play is not available
            if (tokenDetails.interactive) {
                Activity myActivity = this.cordova.getActivity();
                Dialog dialog = GooglePlayServicesUtil.getErrorDialog(playEx.getConnectionStatusCode(), myActivity , AUTH_REQUEST_CODE);
                dialog.show();
            } else {
                Log.e(LOG_TAG, "Google Play Services is not available", playEx);
            }
        } catch (UserRecoverableAuthException recoverableException) {
            // OAuth Permissions for the app during first run
            if(tokenDetails.interactive) {
                Intent permissionsIntent = recoverableException.getIntent();
                launchPermissionsGrantPageAndCallback(permissionsIntent, args, callbackContext);
                // If the user allows it then we need ask for the token again and pass the token to the success callback
                done = false;
            } else {
                Log.e(LOG_TAG, "Recoverable Error occured while getting token. No action was taken as interactive is set to false", recoverableException);
            }
        } catch(Exception e) {
            Log.e(LOG_TAG, "Error occured while getting token", e);
        }

        if(done) {
            getAuthTokenCallback(token, callbackContext);
        }
    }

    private void getAuthTokenCallback(String token, CallbackContext callbackContext) {
        if(token.trim().equals("")) {
            callbackContext.error("Could not get auth token");
        } else {
            try {
                JSONObject jsonObject = new JSONObject();
                jsonObject.put("account", accountName);
                jsonObject.put("token", token);
                callbackContext.success(jsonObject);
            } catch (JSONException e) { }
        }
    }

    private void removeCachedAuthToken(final CordovaArgs args, final CallbackContext callbackContext) {
        this.cordova.getThreadPool().execute(new Runnable() {
            public void run() {
                invalidateToken(args, callbackContext);
            }
        });
    }

    private void invalidateToken(CordovaArgs args, CallbackContext callbackContext) {
        try {
            String token = args.getString(0);
            Context context = this.cordova.getActivity();
            GoogleAuthUtil.clearToken(context, token);
            callbackContext.success();
        } catch (SecurityException e) {
            // This happens when trying to clear a token that doesn't exist.
            callbackContext.success();
        } catch (JSONException e) {
            callbackContext.error("Could not invalidate token due to JSONException.");
        } catch (GooglePlayServicesAvailabilityException e) {
            callbackContext.error("Could not invalidate token due to GooglePlayServicesAvailabilityException.");
        } catch (GoogleAuthException e) {
            callbackContext.error("Could not invalidate token due to GoogleAuthException.");
        } catch (IOException e) {
            callbackContext.error("Could not invalidate token due to IOException.");
        }
    }

    private void getAccounts(CordovaArgs args, CallbackContext callbackContext) {
        // First, get the account manager.
        Context context = this.cordova.getActivity();
        AccountManager accountManager = AccountManager.get(context);

        // Next, get the accounts and put them into the desired array of objects.
        // Note: each account's id is set to an email address.
        // In the documentation, the id is apparently something else.
        Account[] accounts = accountManager.getAccounts();
        JSONArray resultAccounts = new JSONArray();
        for (Account account : accounts) {
            JSONObject resultAccount = new JSONObject();
            try {
                resultAccount.put("id", account.name);
            } catch (JSONException e) { }
            resultAccounts.put(resultAccount);
        }

        // Pass the accounts to the callback.
        callbackContext.success(resultAccounts);
    }
}

