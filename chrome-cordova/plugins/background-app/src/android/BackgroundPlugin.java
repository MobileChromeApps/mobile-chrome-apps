// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.json.JSONException;
import org.json.JSONObject;

import android.util.Log;

import java.util.ArrayList;
import java.util.List;

public class BackgroundPlugin extends CordovaPlugin {
    private static final String LOG_TAG = "BackgroundPlugin";
    private static final String ACTION_SWITCH_TO_FOREGROUND = "switchforeground";

    private static BackgroundPlugin pluginInstance;

    private CallbackContext messageChannel;

    public static void handleSwitchToForeground() {
        if (pluginInstance != null && pluginInstance.messageChannel != null) {
            pluginInstance.sendEventMessage(ACTION_SWITCH_TO_FOREGROUND);
        } else {
            Log.w(LOG_TAG, "Unable to switch to foreground without existing plugin and message channel");
        }
    }

    @Override
    public void pluginInitialize() {
        pluginInstance = this;
    }

    @Override
    public void onReset() {
        messageChannel = null;
        releasePluginMessageChannels();
    }

    @Override
    public void onDestroy() {
        messageChannel = null;
        releasePluginMessageChannels();
    }

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("messageChannel".equals(action)) {
            messageChannel = callbackContext;
            return true;
        }
        return false;
    }

    private void sendEventMessage(String action) {
        JSONObject obj = new JSONObject();
        try {
            obj.put("action", action);
        } catch (JSONException e) {
            Log.e(LOG_TAG, "Failed to create background event", e);
        }
        PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, obj);
        pluginResult.setKeepCallback(true);
        messageChannel.sendPluginResult(pluginResult);
    }

    private void releasePluginMessageChannels() {
        // Release the message channel for all plugins using our background event handler
        //  - The Cordova Plugin framework does not provide a direct way to handle the life cycle
        //    events for plugins (e.g. onReset, onDestroy)
        //  - To avoid extra boilerplate in any plugin using the event handler, will cleanup all
        //    the message channels for plugins here
        BackgroundEventHandler.releaseMessageChannels();
    }

}
