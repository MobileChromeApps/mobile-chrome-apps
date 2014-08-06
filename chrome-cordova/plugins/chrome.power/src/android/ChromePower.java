// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.json.JSONException;

import android.content.Context;
import android.os.PowerManager;
import android.os.PowerManager.WakeLock;
import android.view.WindowManager;

public class ChromePower extends CordovaPlugin {
    private WakeLock systemLock = null;

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("requestKeepAwake".equals(action)) {
            requestKeepAwake(args);
            return true;
        } else if ("releaseKeepAwake".equals(action)) {
            releaseKeepAwake();
            return true;
        }

        return false;
    }

    @Override
    public void onReset() {
        releaseKeepAwake();
    }

    @Override
    public void onDestroy() {
        releaseKeepAwake();
    }

    private void requestKeepAwake(final CordovaArgs args) {
        final String level = args.optString(0);
        cordova.getActivity().runOnUiThread(new Runnable() {
            public void run() {
                if ("display".equals(level)) {
                    cordova.getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                } else if ("system".equals(level)) {
                    if (systemLock == null) {
                        PowerManager powerManager = (PowerManager) cordova.getActivity().getSystemService(Context.POWER_SERVICE);
                        systemLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Chrome Power System lock");
                        systemLock.acquire();
                    }
                }
            }
        });
    }

    private void releaseKeepAwake() {
        cordova.getActivity().runOnUiThread(new Runnable() {
            public void run() {
                cordova.getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                if (systemLock != null) {
                    systemLock.release();
                    systemLock = null;
                }
            }
        });
    }
}
