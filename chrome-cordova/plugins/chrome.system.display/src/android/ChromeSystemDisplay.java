// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.app.Activity;
import android.hardware.display.DisplayManager;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.Display;
import android.view.Surface;

public class ChromeSystemDisplay extends CordovaPlugin {
    private static final String LOG_TAG = "ChromeSystemDisplay";

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
        final DisplayMetrics displayMetrics = new DisplayMetrics();

        try {
            display.getRealMetrics(displayMetrics);
        } catch (NoSuchMethodError e) {
            display.getMetrics(displayMetrics);
        }
        widthPixels = displayMetrics.widthPixels;
        heightPixels = displayMetrics.heightPixels;

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

        // displayMetrics.xdpi is not reliable.
        return displayMetrics.densityDpi;
    }

    private float getDpiY(final Display display) {
        final DisplayMetrics displayMetrics = new DisplayMetrics();
        display.getMetrics(displayMetrics);

        // displayMetrics.ydpi is not reliable.
        return displayMetrics.densityDpi;
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

    private JSONObject getDisplayInfo(final Display display) throws JSONException {
        JSONObject displayInfo = new JSONObject();

        displayInfo.put("id", Integer.toString(display.getDisplayId()));
        try {
            displayInfo.put("name", display.getName());
        } catch (NoSuchMethodError e) {
            displayInfo.put("name", "Default");
        }
        displayInfo.put("isPrimary", display.getDisplayId() == android.view.Display.DEFAULT_DISPLAY);
        displayInfo.put("dpiX", getDpiX(display));
        displayInfo.put("dpiY", getDpiY(display));
        displayInfo.put("rotation", getRotation(display));
        displayInfo.put("bounds", getBounds(display));
        displayInfo.put("overscan", getOverscan());
        displayInfo.put("workArea", getWorkArea(display));
        // mirroringSourceId, isInternal and isEnabled cannot be retrieved at this moment.

        return displayInfo;
    }

    private void getInfo(final CordovaArgs args, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONArray ret = new JSONArray();

                    try {
                        DisplayManager displayManager = (DisplayManager) cordova.getActivity().getSystemService(Activity.DISPLAY_SERVICE);
                        Display[] displays = displayManager.getDisplays();
                        for (Display display : displays) {
                            JSONObject displayInfo = new JSONObject();
                            displayInfo = getDisplayInfo(display);
                            ret.put(displayInfo);
                        }
                    } catch (NoClassDefFoundError e) {
                        Display defaultDisplay = cordova.getActivity().getWindowManager().getDefaultDisplay();
                        JSONObject displayInfo = new JSONObject();
                        displayInfo = getDisplayInfo(defaultDisplay);
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
