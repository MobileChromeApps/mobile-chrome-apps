// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.PluginResult;
import org.json.JSONException;
import org.json.JSONObject;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.util.Log;

import com.google.android.gms.gcm.GoogleCloudMessaging;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;

public class ChromePushMessaging extends CordovaPlugin {
    private static final String LOG_TAG = "ChromePushMessaging";
    private static final String PAYLOAD_LABEL = "payload";

    private static ChromePushMessaging pluginInstance;
    private static List<String> pendingMessages = new ArrayList<String>();
    private ExecutorService executorService;
    private CallbackContext messageChannel;

    @Override
    public void initialize(final CordovaInterface cordova, CordovaWebView webView) {
        super.initialize(cordova, webView);
        executorService = cordova.getThreadPool();
        if (cordova.getActivity().getIntent().hasExtra(PAYLOAD_LABEL)) {
            cordova.getActivity().moveTaskToBack(true);
        }
    }

    @Override
    public void pluginInitialize() {
        pluginInstance = this;
    }

    @Override
    public void onReset() {
        messageChannel = null;
    }

    @Override
    public void onDestroy() {
        messageChannel = null;
    }

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("messageChannel".equals(action)) {
            messageChannel = callbackContext;
            fireStartupMessages(args, callbackContext);
            return true;
        } else if ("getRegistrationId".equals(action)) {
            getRegistrationId(args, callbackContext);
            return true;
        }
        return false;
    }

    static public void handlePushMessage(Context context, Intent intent) {
        JSONObject payload = new JSONObject();
        try {
            for (String key : intent.getExtras().keySet()) {
                payload.put(key, intent.getStringExtra(key));
            }
        } catch (Exception e) {
            Log.e(LOG_TAG, "Error constructing push message payload: " + e);
            return;
        }
        String payloadString = payload.toString();

        if (pluginInstance != null && pluginInstance.messageChannel != null) {
            Log.w(LOG_TAG, "Firing event to already running web view");
            pluginInstance.fireOnMessage(payloadString);
            return;
        }

        pendingMessages.add(payloadString);
        if (pluginInstance == null) {
            try {
                String activityClass = context.getPackageManager().getPackageInfo(context.getPackageName(), PackageManager.GET_ACTIVITIES).activities[0].name;
                Intent activityIntent = Intent.makeMainActivity(new ComponentName(context, activityClass));
                activityIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_FROM_BACKGROUND);
                activityIntent.putExtra(PAYLOAD_LABEL, payloadString);
                pendingMessages.add(payloadString);
                context.startActivity(activityIntent);
            } catch (Exception e) {
                Log.e(LOG_TAG, "Failed to make startActivity intent: " + e);
            }
        }
    }

    private void fireOnMessage(String payload) {
        JSONObject message = new JSONObject();
        try {
            message.put("subchannelId", "0");
            message.put("data", new JSONObject(payload));
        } catch (JSONException e) {
            Log.e(LOG_TAG, "Failed to create push messaging event", e);
        }
        PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, message);
        pluginResult.setKeepCallback(true);
        messageChannel.sendPluginResult(pluginResult);
    }

    private void fireStartupMessages(final CordovaArgs args, final CallbackContext callbackContext) {
        for (int i = 0; i < pendingMessages.size(); i++) {
            fireOnMessage(pendingMessages.get(i));
        }
        pendingMessages.clear();
    }

    private void getRegistrationId(final CordovaArgs args, final CallbackContext callbackContext) {
        executorService.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    GoogleCloudMessaging gcm = GoogleCloudMessaging.getInstance(cordova.getActivity());
                    String regid = gcm.register(args.getString(0));
                    callbackContext.success(regid);
                } catch (Exception e) {
                    Log.e(LOG_TAG, "Could not get registration ID", e);
                    callbackContext.error("Could not get registration ID");
                }
            }
        });
    }
}
