// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import java.io.BufferedReader;
import java.io.FileReader;
import java.lang.System;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.graphics.Rect;
import android.app.Activity;
import android.hardware.display.DisplayManager;
import android.util.DisplayMetrics;
import android.util.Log;
import android.os.Build;
import android.view.Display;
import android.view.Surface;

public class ChromeSystemDisplay extends CordovaPlugin {
    private static final String LOG_TAG = "ChromeSystemDisplay";

    private DisplayManager displayManager;

    @Override
    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
        super.initialize(cordova, webView);
        Activity activity = cordova.getActivity();
        displayManager = (DisplayManager) cordova.getActivity().getSystemService(Activity.DISPLAY_SERVICE);
    }

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("getInfo".equals(action)) {
            getInfo(args, callbackContext);
            return true;
        }
        return false;
    }

    private int getRotation(final Display display) {
        final int rotation = display.getRotation();
        final int DEFAULT_ROTATION = 0;

        if (rotation == Surface.ROTATION_0) {
          return 0;
        } else if (rotation == Surface.ROTATION_90) {
            return 90;
        } else if (rotation == Surface.ROTATION_180) {
            return 180;
        } else if (rotation == Surface.ROTATION_270) {
            return 270;
        }
        return DEFAULT_ROTATION;
    }
    
    private JSONObject getBounds(final Display display) throws JSONException {
        JSONObject ret = new JSONObject();
        int widthPixels = 0;
        int heightPixels = 0;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
            final DisplayMetrics displayMetrics = new DisplayMetrics();
            display.getRealMetrics(displayMetrics);
            widthPixels = displayMetrics.widthPixels;
            heightPixels = displayMetrics.heightPixels;
        }

        ret.put("left", 0);
        ret.put("top", 0);
        ret.put("width", widthPixels);
        ret.put("height", heightPixels);

        return ret;
    }

    private JSONObject getOverscan() throws JSONException {
        JSONObject ret = new JSONObject();

        ret.put("left", 0);
        ret.put("top", 0);
        ret.put("right", 0);
        ret.put("bottom", 0);

        return ret;
    }

    private float getDpiX(final Display display) {
        final DisplayMetrics displayMetrics = new DisplayMetrics();
        display.getMetrics(displayMetrics);

        return displayMetrics.xdpi;
    }

    private float getDpiY(final Display display) {
        final DisplayMetrics displayMetrics = new DisplayMetrics();
        display.getMetrics(displayMetrics);

        return displayMetrics.ydpi;
    }

    private JSONObject getWorkArea(final Display display) throws JSONException {
        JSONObject ret = new JSONObject();
        final DisplayMetrics displayMetrics = new DisplayMetrics();
        display.getMetrics(displayMetrics);

        ret.put("left", 0);
        ret.put("top", 0);
        ret.put("width", displayMetrics.widthPixels);
        ret.put("height", displayMetrics.heightPixels);

        return ret;
    }

    private void getInfo(final CordovaArgs args, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONArray ret = new JSONArray();

                    Display[] displays = displayManager.getDisplays();
                    for (Display display : displays) {
                        JSONObject displayInfo = new JSONObject();

                        displayInfo.put("id", Integer.toString(display.getDisplayId()));
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
                            displayInfo.put("name", display.getName());
                        }
                        displayInfo.put("isPrimary", display.getDisplayId() == android.view.Display.DEFAULT_DISPLAY);
                        displayInfo.put("dpiX", getDpiX(display));
                        displayInfo.put("dpiY", getDpiY(display));
                        displayInfo.put("rotation", getRotation(display));
                        displayInfo.put("bounds", getBounds(display));
                        displayInfo.put("overscan", getOverscan());
                        displayInfo.put("workArea", getWorkArea(display));
                        // mirroringSourceId, isInternal and isEnabled cannot be retrieved at this moment.

                        ret.put(displayInfo);
                    }

                    callbackContext.success(ret);
                } catch (Exception e) {
                    Log.e(LOG_TAG, "Error occured while getting display info", e);
                    callbackContext.error("Could not get display info");
                }
            }
        });
    }
}
