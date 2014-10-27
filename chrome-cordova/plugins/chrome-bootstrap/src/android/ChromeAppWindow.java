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
import android.content.Intent;
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
        cordova.getActivity().moveTaskToBack(true);
        callbackContext.success();
    }

    private void show(final CordovaArgs args, final CallbackContext callbackContext) {
        Activity activity = cordova.getActivity();

        if (activity.hasWindowFocus()) {
            // Window is already visible, nothing to do
            callbackContext.success();
            return;
        }

        Intent activityIntent = new Intent(activity, activity.getClass());
        activityIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);

        // Use the application context to start this activity
        //  - Using activity.startActivity() doesn't work (error seen in logcat)
        //  - A semi-random activity will be shown instead
        activity.getApplicationContext().startActivity(activityIntent);

        callbackContext.success();
    }
}
