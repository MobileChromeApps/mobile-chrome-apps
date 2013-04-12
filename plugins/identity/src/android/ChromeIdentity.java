package org.apache.cordova;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;

import org.apache.cordova.api.CallbackContext;
import org.apache.cordova.api.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.accounts.AccountManager;
import android.app.Activity;
import android.app.Dialog;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import com.google.android.gms.auth.GoogleAuthUtil;
import com.google.android.gms.auth.GooglePlayServicesAvailabilityException;
import com.google.android.gms.auth.UserRecoverableAuthException;
import com.google.android.gms.common.AccountPicker;
import com.google.android.gms.common.GooglePlayServicesUtil;

public class ChromeIdentity extends CordovaPlugin {

    private static final String LOG_TAG = "ChromeIdentity";
    // These are just unique request codes. They can be anything as long as the don't clash.
    private static final int AUTH_REQUEST_CODE = 5;
    private static final int ACCOUNT_CHOOSER_INTENT = 6;
    private static final int OAUTH_PERMISSIONS_GRANT_INTENT = 7;
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
        }

        return false;
    }

    private List<String> loadScopesFromManifest() throws IOException, JSONException {
        Context context = this.cordova.getActivity();
        InputStream is = context.getAssets().open("www/manifest.json");
        //Small trick to get the scanner to pull the entire input stream in one go
        Scanner s = new java.util.Scanner(is).useDelimiter("\\A");
        String contents = s.hasNext() ? s.next() : "";

        JSONObject manifestContents = new JSONObject(contents);
        List<String> scopes = new ArrayList<String>();

        JSONObject oAuthObj = manifestContents.optJSONObject("oauth2");
        if(oAuthObj != null) {
            JSONArray oAuthScopes = oAuthObj.optJSONArray("scopes");
            if(oAuthScopes != null) {
                scopes = JSONUtils.toStringList(oAuthScopes);
            } else {
                throw new IllegalArgumentException("scopes missing from manifest.json");
            }
        } else {
            throw new IllegalArgumentException("oauth2 missing from manifest.json");
        }

        return scopes;
    }

    private String getScopesString() throws IOException, JSONException {
        List<String> scopes = loadScopesFromManifest();
        StringBuilder ret = new StringBuilder("oauth2:");

        for(int i = 0; i < scopes.size(); i++) {
            if(i != 0) {
                ret.append(" ");
            }
            ret.append(scopes.get(i));
        }
        return ret.toString();
    }

    private TokenDetails getTokenDetailsFromArgs(CordovaArgs args) throws JSONException {
        TokenDetails tokenDetails = new TokenDetails();
        JSONObject tokenDetailsObject = args.getJSONObject(0);
        tokenDetails.interactive = tokenDetailsObject.getBoolean("interactive");
        return tokenDetails;
    }

    private boolean haveAccount() {
        return !(accountName.isEmpty());
    }

    private void launchAccountChooserAndCallback(CordovaArgs cordovaArgsToSave, CallbackContext callbackContextToSave) {
        this.savedCordovaArgs = cordovaArgsToSave;
        this.savedCallbackContext = callbackContextToSave;
        this.savedContent  = true;
        // Note the "google.com" filter aqccepts both google and gmail accounts.
        Intent intent = AccountPicker.newChooseAccountIntent(null, null, new String[]{"com.google"}, false, null, null, null, null);
        this.cordova.startActivityForResult(this, intent, ACCOUNT_CHOOSER_INTENT);
    }

    private void launchPermissionsGrantPageAndCallback(Intent permissionsIntent, CordovaArgs cordovaArgsToSave, CallbackContext callbackContextToSave) {
        this.savedCallbackContext = callbackContextToSave;
        this.savedCordovaArgs = cordovaArgsToSave;
        this.savedContent  = true;
        this.cordova.startActivityForResult(this, permissionsIntent, OAUTH_PERMISSIONS_GRANT_INTENT);
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent intent) {
        // Enter only if we have requests waiting
        if(savedContent) {
            if(requestCode == ACCOUNT_CHOOSER_INTENT ) {
                if(resultCode == Activity.RESULT_OK && intent.hasExtra(AccountManager.KEY_ACCOUNT_NAME)) {
                    accountName = intent.getStringExtra(AccountManager.KEY_ACCOUNT_NAME);
                    getAuthToken(this.savedCordovaArgs, this.savedCallbackContext);
                } else {
                    this.savedCallbackContext.error("User declined to provide an account");
                }
                this.savedContent  = false;
                this.savedCallbackContext = null;
                this.savedCordovaArgs = null;
            } else if(requestCode == OAUTH_PERMISSIONS_GRANT_INTENT) {
                if(resultCode == Activity.RESULT_OK && intent.hasExtra("authtoken")) {
                    String token = intent.getStringExtra("authtoken");
                    getAuthTokenCallback(token, this.savedCallbackContext);
                } else {
                    this.savedCallbackContext.error("User did not approve oAuth permissions request");
                }
                this.savedContent  = false;
                this.savedCallbackContext = null;
                this.savedCordovaArgs = null;
            }
        }
    }

    private void getAuthToken(final CordovaArgs args, final CallbackContext callbackContext) {
        this.cordova.getThreadPool().execute(new Runnable() {
            public void run() {
                if(!haveAccount()) {
                    launchAccountChooserAndCallback(args, callbackContext);
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
            scope = getScopesString();
            context = this.cordova.getActivity();
            token = GoogleAuthUtil.getToken(context, account, scope);
        } catch (GooglePlayServicesAvailabilityException playEx) {
            // Play is not available
            if(tokenDetails.interactive) {
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
            callbackContext.success(token);
        }
    }
}
