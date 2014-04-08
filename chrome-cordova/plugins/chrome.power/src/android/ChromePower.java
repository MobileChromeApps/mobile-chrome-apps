// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import android.view.WindowManager;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONException;

public class ChromePower extends CordovaPlugin {
    private static final String LOG_TAG = "ChromePower";

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("requestKeepAwake".equals(action)) {
            requestKeepAwake(args, callbackContext);
            return true;
        } else if ("releaseKeepAwake".equals(action)) {
            releaseKeepAwake(args, callbackContext);
            return true;
        }

        return false;
    }

    private void requestKeepAwake(final CordovaArgs args, final CallbackContext callbackContext) {
        cordova.getActivity().runOnUiThread(new Runnable() {
            public void run() {
                cordova.getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            }
        });
    }

    private void releaseKeepAwake(final CordovaArgs args, final CallbackContext callbackContext) {
        cordova.getActivity().runOnUiThread(new Runnable() {
            public void run() {
                cordova.getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            }
        });
    }
}

