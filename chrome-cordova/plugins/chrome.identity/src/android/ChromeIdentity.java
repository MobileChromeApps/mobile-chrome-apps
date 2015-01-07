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
import android.content.DialogInterface;
import android.content.Intent;
import android.os.Bundle;
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
    private static final int AUTH_REQUEST_CODE = 1;
    private static final int ACCOUNT_CHOOSER_REQUEST_CODE = 2;
    private static final int USER_RECOVERABLE_REQUEST_CODE = 3;
    private static final int UPDATE_GOOGLE_PLAY_SERVICES_REQUEST_CODE = 4;

    // Error codes.
    private static final int ERROR_GOOGLE_PLAY_SERVICES_UNAVAILABLE = -1;
    private static final int ERROR_REQUIRES_USER_INTERACTION = -2;
    private static final int ERROR_NETWORK_UNAVAILABLE = -3;
    private static final int ERROR_USER_CANCELLED = -4;
    private static final int ERROR_CONCURRENT_REQUEST = -5;

    private String cachedAccountName;
    private CallDetails pendingCallDetails;

    private class CallDetails {
        String action;
        CallbackContext callbackContext;
        String scopesString;
        boolean interactive = true;
        String accountHint;
        String token;

        CallDetails(String action, CallbackContext callbackContext) {
            this.action = action;
            this.callbackContext = callbackContext;
        }

        void performAction(boolean performAsync) {
            if (pendingCallDetails != null) {
                callbackContext.error(ERROR_CONCURRENT_REQUEST);
                return;
            }

            pendingCallDetails = this;
            Runnable runnable = new Runnable() {
                public void run() {
                    if ("getAuthToken".equals(action)) {
                        getAuthToken(interactive, scopesString, accountHint, callbackContext);
                    } else if ("removeCachedAuthToken".equals(action)) {
                        removeCachedAuthToken(token, callbackContext);
                    } else if ("getAccounts".equals(action)) {
                        getAccounts(callbackContext);
                    }
                }
            };
            if (performAsync) {
                cordova.getThreadPool().execute(runnable);
            } else {
                runnable.run();
            }
        }
    }

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        CallDetails callDetails = new CallDetails(action, callbackContext);

        if ("getAuthToken".equals(action)) {
            callDetails.interactive = args.getBoolean(0);
            // 1 is clientId
            callDetails.scopesString = createScopesString(args.getJSONArray(2));
            callDetails.accountHint = args.isNull(3) ? null : args.getString(3);
        } else if ("removeCachedAuthToken".equals(action)) {
            callDetails.token = args.getString(0);
        } else if ("getAccounts".equals(action)) {
            // No args.
        } else {
            return false;
        }
        callDetails.performAction(true);
        return true;
    }

    private static String createScopesString(JSONArray scopes) throws JSONException {
        StringBuilder ret = new StringBuilder("oauth2:");

        for (int i = 0; i < scopes.length(); i++) {
            if (i != 0) {
                ret.append(" ");
            }
            ret.append(scopes.getString(i));
        }
        return ret.toString();
    }

    private void launchAccountChooserAndCallback(boolean interactive, String scopesString, CallbackContext callbackContext) {
        // Check if Google Play Services is available.
        int availabilityCode = GooglePlayServicesUtil.isGooglePlayServicesAvailable(cordova.getActivity());
        if (availabilityCode != ConnectionResult.SUCCESS) {
            handlePlayServicesError(availabilityCode, interactive, callbackContext);
            return;
        }
        // The "google.com" filter accepts both Google and Gmail accounts.
        Intent intent = AccountPicker.newChooseAccountIntent(null, null, new String[]{"com.google"}, false, null, null, null, null);
        cordova.startActivityForResult(this, intent, ACCOUNT_CHOOSER_REQUEST_CODE);
    }

    @Override
    public void onActivityResult(final int requestCode, final int resultCode, final Intent intent) {
        // Enter only if we have requests waiting
        if (pendingCallDetails != null) {
            CallDetails callDetails = pendingCallDetails;
            pendingCallDetails = null;
            if (requestCode == ACCOUNT_CHOOSER_REQUEST_CODE) {
                // They chose an account.
                if (resultCode == Activity.RESULT_OK) {
                    callDetails.accountHint = intent.getStringExtra(AccountManager.KEY_ACCOUNT_NAME);
                    callDetails.performAction(true);
                } else {
                    callDetails.callbackContext.error(ERROR_USER_CANCELLED);
                }
            } else if (requestCode == USER_RECOVERABLE_REQUEST_CODE) {
                if (resultCode == Activity.RESULT_OK) {
                    // They approved consent screen. Retry auth.
                    callDetails.performAction(true);
                } else {
                    callDetails.callbackContext.error(ERROR_USER_CANCELLED);
                }
            } else if (requestCode == UPDATE_GOOGLE_PLAY_SERVICES_REQUEST_CODE) {
                // resultCode is RESULT_CANCELED even when an update occurs!
                if (ConnectionResult.SUCCESS == GooglePlayServicesUtil.isGooglePlayServicesAvailable(cordova.getActivity())) {
                    callDetails.performAction(true);
                } else {
                    callDetails.callbackContext.error(ERROR_USER_CANCELLED);
                }
            } else {
                Log.e(LOG_TAG, "Unexpected requestCode", new RuntimeException());
            }
        } else {
            Log.w(LOG_TAG, "Got stale activityResult! requestCode=" + requestCode);
        }
    }

    private void getAuthToken(boolean interactive, String scopesString, String accountHint, CallbackContext callbackContext) {
        if (cachedAccountName == null) {
            if (accountHint != null) {
                cachedAccountName = accountHint;
                getAuthTokenWithAccount(interactive, cachedAccountName, scopesString, callbackContext);
            } else {
                launchAccountChooserAndCallback(interactive, scopesString, callbackContext);
            }
        } else {
            getAuthTokenWithAccount(interactive, cachedAccountName, scopesString, callbackContext);
        }
    }

    private void handlePlayServicesError(final int errorCode, final boolean interactive, final CallbackContext callbackContext) {
        Log.d(LOG_TAG, "Got PlayServices error: " + errorCode);
        final boolean userRecoverable = GooglePlayServicesUtil.isUserRecoverableError(errorCode);
        if (!interactive) {
            pendingCallDetails = null;
            callbackContext.error(userRecoverable ? ERROR_REQUIRES_USER_INTERACTION : ERROR_GOOGLE_PLAY_SERVICES_UNAVAILABLE);
            return;
        }
        if (errorCode == ConnectionResult.SERVICE_MISSING) {
            // This happens in the emulator where Play Services doesn't exist, or on non-Google Android devices.
            pendingCallDetails = null;
            callbackContext.error(ERROR_GOOGLE_PLAY_SERVICES_UNAVAILABLE);
            return;
        }

        cordova.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (userRecoverable) {
                    final CallDetails callDetails = pendingCallDetails;
                    // Need to set the callback manually since the dialog is the one fires the intent.
                    cordova.setActivityResultCallback(ChromeIdentity.this);
                    Dialog dialog = GooglePlayServicesUtil.getErrorDialog(errorCode, cordova.getActivity(), UPDATE_GOOGLE_PLAY_SERVICES_REQUEST_CODE, new DialogInterface.OnCancelListener() {
                        @Override
                        public void onCancel(DialogInterface dialogInterface) {
                            Log.i(LOG_TAG, "User cancelled the update request");
                            cordova.setActivityResultCallback(null);
                            pendingCallDetails = null;
                            if (!callDetails.callbackContext.isFinished()) {
                                callDetails.callbackContext.error(ERROR_USER_CANCELLED);
                            }
                        }
                    });
                    dialog.show();
                } else {
                    Dialog dialog = GooglePlayServicesUtil.getErrorDialog(errorCode, cordova.getActivity(), AUTH_REQUEST_CODE);
                    dialog.show();
                    callbackContext.error(ERROR_GOOGLE_PLAY_SERVICES_UNAVAILABLE);
                    pendingCallDetails = null;
                }
            }
        });
    }

    private void handleGoogleAuthException(GoogleAuthException ex, boolean interactive, CallbackContext callbackContext) {
        if (ex instanceof GooglePlayServicesAvailabilityException) {
            handlePlayServicesError(((GooglePlayServicesAvailabilityException)ex).getConnectionStatusCode(), interactive, callbackContext);
        } else if (ex instanceof UserRecoverableAuthException){
            // OAuth Permissions for the app during first run
            if (interactive) {
                Intent permissionsIntent = ((UserRecoverableAuthException)ex).getIntent();
                cordova.startActivityForResult(this, permissionsIntent, USER_RECOVERABLE_REQUEST_CODE);
            } else {
                Log.e(LOG_TAG, "Recoverable Error occurred while getting token. No action was taken as interactive is set to false", ex);
                callbackContext.error(ERROR_REQUIRES_USER_INTERACTION);
                pendingCallDetails = null;
            }
        } else {
            // This is likely unrecoverable.
            Log.e(LOG_TAG, "Unrecoverable authentication exception.", ex);
            callbackContext.error(ERROR_GOOGLE_PLAY_SERVICES_UNAVAILABLE);
            pendingCallDetails = null;
        }
    }

    private void getAuthTokenWithAccount(boolean interactive, String accountName, String scopesString, CallbackContext callbackContext) {
        try {
            Bundle optionsBundle = new Bundle();
            // Don't show native spinner since we don't show this on desktop either.
            optionsBundle.putBoolean(GoogleAuthUtil.KEY_SUPPRESS_PROGRESS_SCREEN, true);
            String token = GoogleAuthUtil.getToken(webView.getContext(), accountName, scopesString, optionsBundle);
            callbackContext.success(createTokenJsonObject(accountName, token));
            pendingCallDetails = null;
        } catch (GoogleAuthException authEx) {
            handleGoogleAuthException(authEx, interactive, callbackContext);
        } catch (IOException e) {
            Log.e(LOG_TAG, "Error occurred while getting token", e);
            callbackContext.error(ERROR_NETWORK_UNAVAILABLE);
            pendingCallDetails = null;
        }
    }

    private static JSONObject createTokenJsonObject(String accountName, String token) {
        JSONObject jsonObject = new JSONObject();
        try {
            jsonObject.put("account", accountName);
            jsonObject.put("token", token);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        return jsonObject;
    }

    private void removeCachedAuthToken(String token, CallbackContext callbackContext) {
        try {
            Context context = cordova.getActivity();
            GoogleAuthUtil.clearToken(context, token);
            callbackContext.success();
            pendingCallDetails = null;
        } catch (SecurityException e) {
            // This happens when trying to clear a token that doesn't exist.
            callbackContext.success();
            pendingCallDetails = null;
        } catch (GoogleAuthException authEx) {
            handleGoogleAuthException(authEx, true, callbackContext);
        } catch (IOException e) {
            Log.e(LOG_TAG, "Error occurred while getting token", e);
            callbackContext.error(ERROR_NETWORK_UNAVAILABLE);
            pendingCallDetails = null;
        }
    }

    private void getAccounts(CallbackContext callbackContext) {
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
        pendingCallDetails = null;
    }
}

