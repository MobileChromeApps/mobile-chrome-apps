// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package com.google.cordova;

import java.io.IOException;
import java.io.InputStream;
import java.io.ByteArrayInputStream;
import java.util.NavigableSet;
import java.util.TreeMap;

import org.apache.cordova.api.CordovaPlugin;
import android.util.Log;

public class ChromeBootstrap extends CordovaPlugin {

    private static final String LOG_TAG = "ChromeBootstrap";

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("doesNeedLoad".equals(action)) {
            callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, true));
            return true;
        }
        return false;
    }

}
