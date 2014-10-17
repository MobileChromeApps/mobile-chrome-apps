// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.PluginResult;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.util.Log;

import org.json.JSONException;

public class ChromeAppWindow extends CordovaPlugin {

    private static final String LOG_TAG = "ChromeAppWindow";

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("show".equals(action)) {
            show(args, callbackContext);
            return true;
        } else if ("hide".equals(action)) {
            hide(args, callbackContext);
            return true;
        }

        return false;
    }

    private void hide(final CordovaArgs args, final CallbackContext callbackContext) {
        try {
            cordova.getActivity().moveTaskToBack(true);
            callbackContext.success();
        } catch (Exception e) {
            Log.e(LOG_TAG, "Could not hide window", e);
            callbackContext.error("Could not hide window");
        }
    }
    
    private void show(final CordovaArgs args, final CallbackContext callbackContext) {
        try {
            Activity activity = cordova.getActivity();
            
            if (activity.hasWindowFocus()) {
                // Window is already visible, nothing to do
                callbackContext.success();
                return;
            }

            Context context = activity.getApplicationContext();
            
            String activityClass = context.getPackageManager().getPackageInfo(context.getPackageName(), PackageManager.GET_ACTIVITIES).activities[0].name;
            Log.d(LOG_TAG, "Starting activity '" + activityClass + "', from package: " + context.getPackageName());

            ComponentName component = new ComponentName(context, activityClass);
            Log.d(LOG_TAG, "Component is: " + component.flattenToString());
            
            Intent activityIntent = Intent.makeMainActivity(component);
            activityIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);

            Log.d(LOG_TAG, "Intent is: " + activityIntent.toUri(0));
            
            //boolean focused = true;
            //if (!args.isNull(0)) {
            //                focused = args.getBoolean(0);
            //}
            activity.startActivity(activityIntent);
            
            callbackContext.success();
        } catch (Exception e) {
            Log.e(LOG_TAG, "Could not show window", e);
            callbackContext.error("Could not show window");
        }
    }
}
