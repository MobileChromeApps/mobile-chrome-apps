// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import java.io.File;
import java.lang.reflect.Field;
import java.lang.reflect.Method;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.PluginManager;
import org.apache.cordova.PluginResult;
import org.apache.cordova.file.FileUtils;
import org.apache.cordova.file.LocalFilesystem;

import org.json.JSONException;

public class SyncFileSystem extends CordovaPlugin {

    @Override
    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
    	super.initialize(cordova, webView);
        String syncableRoot = cordova.getActivity().getFilesDir().getAbsolutePath() + "/syncfs/";
        new File(syncableRoot).mkdirs();

        PluginManager pm = null;
        try {
            Method gpm = webView.getClass().getMethod("getPluginManager");
            pm = (PluginManager) gpm.invoke(webView);
        } catch (Exception e) {}
        if (pm == null) {
            try {
                Field pmf = webView.getClass().getField("pluginManager");
                pm = (PluginManager)pmf.get(webView);
            } catch (Exception e) {}
        }
        FileUtils filePlugin = (FileUtils) pm.getPlugin("File");
        LocalFilesystem syncFs = new LocalFilesystem("syncable", cordova, syncableRoot);
        filePlugin.registerFilesystem(syncFs);
    }

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("getRootURL".equals(action)) {
            callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, "cdvfile://localhost/syncable/"));
            return true;
        }
        return false;
    }
}
