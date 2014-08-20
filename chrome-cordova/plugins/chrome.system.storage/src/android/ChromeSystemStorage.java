// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import java.io.File;
import java.util.UUID;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.os.Environment;
import android.util.Log;

public class ChromeSystemStorage extends CordovaPlugin {

    private static final String LOG_TAG = "ChromeSystemStorage";
    private String externalStorageId = null;

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("getInfo".equals(action)) {
            getInfo(args, callbackContext);
            return true;
        }
        return false;
    }

    private String getExternalStorageId() {
        if (externalStorageId == null) {
            externalStorageId = UUID.randomUUID().toString();
        }
        return externalStorageId;
    }

    private void getInfo(final CordovaArgs args, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONArray ret = new JSONArray();

                    String externalStorageState = Environment.getExternalStorageState();
                    if (Environment.MEDIA_MOUNTED.equals(externalStorageState)) {
                        JSONObject externalStorage = new JSONObject();
                        File externalStorageDirectory = Environment.getExternalStorageDirectory();
                        externalStorage.put("id", getExternalStorageId());
                        externalStorage.put("name", externalStorageDirectory.getPath());
                        externalStorage.put("type", Environment.isExternalStorageRemovable() ? "removable" : "fixed");
                        externalStorage.put("capacity", externalStorageDirectory.getTotalSpace());
                        ret.put(externalStorage);
                    }

                    callbackContext.success(ret);
                } catch (Exception e) {
                    Log.e(LOG_TAG, "Error occured while getting Storage info", e);
                    callbackContext.error("Could not get Storage info");
                }
            }
        });
    }
}
