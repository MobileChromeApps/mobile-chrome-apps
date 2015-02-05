// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.PluginResult;

import android.content.Intent;
import android.util.Log;

import org.json.JSONException;

public class ChromeBootstrap extends CordovaPlugin {

    private static final String LOG_TAG = "ChromeBootstrap";
    private boolean needLaunch;

    @Override
    protected void pluginInitialize() {
        setLaunchFlag();
    }

    private void setLaunchFlag() {
        // Assume that the app was explicitly launched, by default
        needLaunch = true;

        Intent startIntent = cordova.getActivity().getIntent();

        // If the starting intent has the background flag set, only then is the launched
        // event not needed
        // NOTE: This requires any code/plugins that can start the app from a background event
        //       to cooperate, and set the flag.
        if (Intent.FLAG_FROM_BACKGROUND == (startIntent.getFlags() & Intent.FLAG_FROM_BACKGROUND)) {
            needLaunch = false;
            Log.v(LOG_TAG, "App was started from background event, not launched by user");
        }
    }

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("doesNeedLaunch".equals(action)) {
            callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, needLaunch));
            return true;
        }
        return false;
    }

}
