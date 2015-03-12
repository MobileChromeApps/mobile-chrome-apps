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

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import java.lang.ref.WeakReference;
import java.util.Iterator;
import java.util.List;
import java.util.ArrayList;

public class BackgroundEventHandler<TPlugin extends CordovaPlugin> {
    private static final String LOG_TAG = "BackgroundEventHandler";
    private static List< WeakReference<BackgroundEventHandler> > handlers = new ArrayList< WeakReference<BackgroundEventHandler> >();

    // TODO: we should make these maps of viewId -> pluginInstance in order to support
    // multiple webviews.
    private TPlugin pluginInstance;
    private CallbackContext messageChannel;
    private List<BackgroundEventInfo> pendingEvents = new ArrayList<BackgroundEventInfo>();

    protected BackgroundEventHandler() {
        handlerCreated(this);
    }

    public void handleBroadcast(Context context, Intent intent) {
        BackgroundEventInfo event = mapBroadcast(context, intent);

        if (event == null) {
            // No corresponding event generated, meaning the broadcast is to be ignored
            return;
        }

        if (pluginInstance != null && messageChannel != null) {
            Log.d(LOG_TAG, "Firing event to already running web view");
            sendEventMessage(event);
        } else {
            pendingEvents.add(event);
            if (pluginInstance == null) {
                Log.d(LOG_TAG, "Launch app in background to handle event");
                BackgroundActivityLauncher.launchBackground(context, intent);
            }
        }
    }

    public void makeBackgroundEventIntent(Intent intent) {
        BackgroundActivityLauncher.setupStartFromBackgroundEvent(intent, pluginInstance.cordova.getActivity().getIntent().getComponent());
    }

    public void pluginInitialize(TPlugin instance) {
        // If started from a background event, hide the activity
        if (pluginInstance == null) {
            Activity activity = instance.cordova.getActivity();
            if (BackgroundActivityLauncher.didStartFromBackgroundEvent(activity.getIntent())) {
                activity.moveTaskToBack(true);
            }
        }
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

    protected BackgroundEventInfo mapBroadcast(Context context, Intent intent) {
        return new BackgroundEventInfo(intent.getAction());
    }

    protected void mapEventToMessage(BackgroundEventInfo event, JSONObject message) throws JSONException {
        if (event.action != null) {
            message.put("action", event.action);
        }
    }

    protected TPlugin getCurrentPlugin() {
        return pluginInstance;
    }

    private void firePendingEvents() {
        for (BackgroundEventInfo event : pendingEvents) {
            sendEventMessage(event);
        }
        pendingEvents.clear();
    }

    private void sendEventMessage(BackgroundEventInfo event) {
        JSONObject message = new JSONObject();
        try {
            mapEventToMessage(event, message);
        } catch (JSONException e) {
            Log.e(LOG_TAG, "Failed to create background event message", e);
        }
        PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, message);
        pluginResult.setKeepCallback(true);
        messageChannel.sendPluginResult(pluginResult);
    }

    private void releaseMessageChannel() {
        messageChannel = null;
    }

    private static void handlerCreated(BackgroundEventHandler handler) {
        handlers.add(new WeakReference<BackgroundEventHandler>(handler));
    }

    static void releaseMessageChannels() {

        for (Iterator<WeakReference<BackgroundEventHandler>> iterator = handlers.iterator(); iterator.hasNext();) {
            BackgroundEventHandler handler = iterator.next().get();

            if (handler == null) {
                // Remove reference as the handler has been garbage collected
                iterator.remove();
                continue;
            }

            handler.releaseMessageChannel();
        }
    }
}
