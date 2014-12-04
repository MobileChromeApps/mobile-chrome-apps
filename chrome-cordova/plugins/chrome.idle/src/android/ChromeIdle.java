// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.apache.cordova.PluginResult.Status;
import org.json.JSONException;

public class ChromeIdle extends CordovaPlugin {
    private BroadcastReceiver lockReceiver;
    private CallbackContext lockCallbackContext;

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("initialize".equals(action)) {
            initialize(callbackContext);
            return true;
        }

        return false;
    }

    private void initialize(final CallbackContext callbackContext) {
        // Store the callback context for later use.
        this.lockCallbackContext = callbackContext;

        // Set up an intent filter for lock intents.
        IntentFilter intentFilter = new IntentFilter(Intent.ACTION_SCREEN_ON);
        intentFilter.addAction(Intent.ACTION_SCREEN_OFF);
        
        // Create the broadcast receiver, passing along the callback context to use, and then register it.
        this.lockReceiver = new LockReceiver();
        webView.getContext().registerReceiver(this.lockReceiver, intentFilter);
    }
    
    private void cleanUp() {
        // Unregister the broadcast receiver.
        if (this.lockReceiver != null) {
            webView.getContext().unregisterReceiver(this.lockReceiver);
            this.lockReceiver = null;
        }
        
        // Null out the callback context.
        this.lockCallbackContext = null;
    }

    public void onDestroy() {
        cleanUp();
    }

    public void onReset() {
        cleanUp();
    }

    private class LockReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            // Determine the new state, based on the intent.
            String newState = null;
            if (intent.getAction().equals(Intent.ACTION_SCREEN_ON)) {
                newState = "active";
            } else if (intent.getAction().equals(Intent.ACTION_SCREEN_OFF)) {
                newState = "locked";
            }
            
            // Create and the plugin result, making sure to keep the callback around for later state changes.
            PluginResult pluginResult = new PluginResult(Status.OK, newState);
            pluginResult.setKeepCallback(true);
            lockCallbackContext.sendPluginResult(pluginResult);
        }
    }
}

