// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.json.JSONException;
import org.json.JSONObject;

import android.content.Context;
import android.content.Intent;
import android.util.Log;

import java.util.List;
import java.util.ArrayList;

public class BackgroundEventHandler<TPlugin extends CordovaPlugin> {
    private static final String LOG_TAG = "BackgroundEventHandler";

    // TODO: we should make these maps of viewId -> pluginInstance in order to support
    // multiple webviews.
    private CordovaPlugin pluginInstance;
    private CallbackContext messageChannel;
    private List<BackgroundEventInfo> pendingEvents = new ArrayList<BackgroundEventInfo>();

    public void handleBroadcast(Context context, Intent intent) {
        BackgroundEventInfo event = mapBroadcast(context, intent);

        if (pluginInstance != null && messageChannel != null) {
            Log.w(LOG_TAG, "Firing notification to already running webview");
            sendEventMessage(event);
        } else {
            pendingEvents.add(event);
            if (pluginInstance == null) {
                BackgroundActivity.launchBackground(context);
            }
        }
    }

    public void pluginInitialize(TPlugin instance) {
        pluginInstance = instance;
    }

    public boolean pluginExecute(TPlugin instance,
                                 String action,
                                 CordovaArgs args,
                                 final CallbackContext callbackContext) throws JSONException {
        // TODO: Do we need to verify that the given instance matches the stored pluginInstance?
        if ("messageChannel".equals(action)) {
            messageChannel = callbackContext;
            firePendingEvents();
            return true;
        }
        return false;
    }

    //TODO: Can we handle in BackgroundPlugin, and cleanup per plugin there?

    /*
    @Override
    public void onReset() {
        messageChannel = null;
    }

    @Override
    public void onDestroy() {
        messageChannel = null;
    }
*/

    public BackgroundEventInfo mapBroadcast(Context context, Intent intent) {
        return new BackgroundEventInfo(intent.getAction());
    }

    public void mapEventToMessage(BackgroundEventInfo event, JSONObject obj) throws JSONException {
        if (event.action != null) {
            obj.put("action", event.action);
        }
    }

    private void firePendingEvents() {
        for (BackgroundEventInfo event : pendingEvents) {
            sendEventMessage(event);
        }
        pendingEvents.clear();
    }

    private void sendEventMessage(BackgroundEventInfo event) {
        JSONObject obj = new JSONObject();
        try {
            mapEventToMessage(event, obj);
        } catch (JSONException e) {
            Log.e(LOG_TAG, "Failed to create background event message", e);
        }
        PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, obj);
        pluginResult.setKeepCallback(true);
        messageChannel.sendPluginResult(pluginResult);
    }

}
