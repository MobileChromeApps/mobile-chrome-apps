// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package com.google.cordova;

import org.apache.cordova.api.CordovaPlugin;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.api.CallbackContext;
import org.apache.cordova.api.PluginResult;

import android.util.Log;

import org.json.JSONException;

public class ChromeBootstrap extends CordovaPlugin {

    private static final String LOG_TAG = "ChromeBootstrap";

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("doesNeedLaunch".equals(action)) {
            callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, true));
            return true;
        }
        return false;
    }

}
