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
import android.os.Bundle;
import android.util.Log;

import com.google.android.gms.gcm.GoogleCloudMessaging;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.atomic.AtomicInteger;

public class ChromeGcm extends CordovaPlugin {
    private static final String LOG_TAG = "ChromeGcm";
    private static final String PAYLOAD_LABEL = "payload";
    // TODO: Make these private when all logic moved into this class
    public static final String EVENT_ACTION_DELETED = "deleted";
    public static final String EVENT_ACTION_MESSAGE = "message";
    public static final String EVENT_ACTION_SEND_ERROR = "send_error";

    private static CordovaWebView webView;
    private static boolean safeToFireMessages = false;
    private static ChromeGcm pluginInstance;
    private static List<EventInfo> pendingEvents = new ArrayList<EventInfo>();
    private ExecutorService executorService;

    AtomicInteger msgId = new AtomicInteger();
    GoogleCloudMessaging gcm;
    private static Context context;
    private CallbackContext messageChannel;

    private static class EventInfo {
        public String action;
        public String messageId;
        public String payload;

        public EventInfo(String action, String messageId, String payload) {
            this.action = action;
            this.messageId = messageId;
            this.payload = payload;
        }
    }

    public static void handleGcmAction(Context context, Intent intent, String action, String payload) {
        if (pluginInstance != null && pluginInstance.messageChannel != null) {
            Log.w(LOG_TAG, "Firing event to already running webview");
            pluginInstance.sendGCMEvent(action, payload);
        } else {
            pendingEvents.add(new EventInfo(action, null, payload));
            if (pluginInstance == null) {
                startApp(context);
            }
        }
    }

    @Override
    public void initialize(final CordovaInterface cordova, CordovaWebView webView) {
        safeToFireMessages = false;
        super.initialize(cordova, webView);
        ChromeGcm.webView = webView;
        executorService = cordova.getThreadPool();
        if (cordova.getActivity().getIntent().hasExtra(PAYLOAD_LABEL)) {
            cordova.getActivity().moveTaskToBack(true);
        }
        context = cordova.getActivity().getApplicationContext();
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
            fireQueuedEvents(args, callbackContext);
            return true;
        } else if ("getRegistrationId".equals(action)) {
            getRegistrationId(args, callbackContext);
            return true;
        } else if ("send".equals(action)) {
            sendMessage(args, callbackContext);
            return true;
        } else if ("unregister".equals(action)) {
            unregister(args, callbackContext);
            return true;
        }
        return false;
    }

    static public void startApp(Context context) {
        if (webView == null) {
            try {
                String activityClass = context.getPackageManager().getPackageInfo(context.getPackageName(), PackageManager.GET_ACTIVITIES).activities[0].name;
                Intent activityIntent = Intent.makeMainActivity(new ComponentName(context, activityClass));
                activityIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_FROM_BACKGROUND);
                activityIntent.putExtra(PAYLOAD_LABEL, "dummy");
                context.startActivity(activityIntent);
            } catch (Exception e) {
                Log.e(LOG_TAG, "Failed to make startActivity intent: " + e);
            }
        }
    }

    private void sendGCMEvent(String action, String payloadContent) {
        JSONObject obj = new JSONObject();
        try {
            obj.put("action", action);

            switch (action)
            {
                case EVENT_ACTION_DELETED:
                    // No additional data required
                    break;

                case EVENT_ACTION_MESSAGE:
                    JSONObject message = new JSONObject();
                    message.put("data", new JSONObject(payloadContent));
                    //message.put("collapseKey", ???);
                    obj.put("message", message);
                    break;

                case EVENT_ACTION_SEND_ERROR:
                    JSONObject error = new JSONObject();
                    error.put("messageId", "1"); // TODO: Should not hard-code message id?
                    error.put("errorMessage", payloadContent);
                    //error.put("details", ???);
                    obj.put("error", error);
                    break;
            }
        } catch (JSONException e) {
            Log.e(LOG_TAG, "Failed to create gcm event", e);
        }
        PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, obj);
        pluginResult.setKeepCallback(true);
        messageChannel.sendPluginResult(pluginResult);
    }

    private void fireQueuedEvents(final CordovaArgs args, final CallbackContext callbackContext) {
        Log.d(LOG_TAG,"Firing " + pendingEvents.size() + " pending events");

        for (EventInfo event : pendingEvents) {
            sendGCMEvent(event.action, event.payload);
        }
        pendingEvents.clear();
    }

    private void unregister(final CordovaArgs args, final CallbackContext callbackContext) {
        executorService.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    if(gcm == null) {
                        gcm = GoogleCloudMessaging.getInstance(cordova.getActivity());
                    }
                    gcm.unregister();
                    callbackContext.success();
                } catch (Exception e) {
                    Log.e(LOG_TAG, "Error during unregister", e);
                    callbackContext.error("Error during unregister");
                }
            }
        });
    }

    private void sendMessage(final CordovaArgs args, final CallbackContext callbackContext) {
        executorService.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    if (gcm == null) {
                        gcm = GoogleCloudMessaging.getInstance(cordova.getActivity());
                    }
                    JSONObject msg = args.getJSONObject(0);
                    // TODO: test for valid input
                    String destination = msg.getString("destinationId");
                    JSONObject data = msg.getJSONObject("data");
                    Bundle bundle = new Bundle();
                    for (Iterator keys = data.keys(); keys.hasNext();) {
                      String key = (String)keys.next();
                      bundle.putString(key, data.optString(key));
                    }
                    String id = Integer.toString(msgId.incrementAndGet());
                    gcm.send(destination, id, bundle);
                    callbackContext.success(id);
                } catch (Exception e) {
                    Log.e(LOG_TAG, "Error sending message", e);
                    callbackContext.error("Error sending message");
                }
            }
        });
    }

    private void getRegistrationId(final CordovaArgs args, final CallbackContext callbackContext) {
        executorService.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    if (gcm == null) {
                        gcm = GoogleCloudMessaging.getInstance(cordova.getActivity());
                    }
                    if (gcm == null) {
                        Log.e(LOG_TAG, "Could not create gcm instance");
                        callbackContext.error("Could not create GCM instance");
                        return;
                    }
                    String sid = args.getString(0);
                    Log.d(LOG_TAG, "Registering sender ID: " + sid);
                    String regid = gcm.register(sid);
                    callbackContext.success(regid);
                } catch (Exception e) {
                    Log.e(LOG_TAG, "Could not get registration ID", e);
                    callbackContext.error("Could not get registration ID");
                }
            }
        });
    }
}
