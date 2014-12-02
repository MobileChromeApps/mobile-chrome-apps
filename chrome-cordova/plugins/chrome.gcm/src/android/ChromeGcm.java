// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import com.google.android.gms.gcm.GoogleCloudMessaging;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Iterator;
import java.util.concurrent.atomic.AtomicInteger;

public class ChromeGcm extends CordovaPlugin {
    private static final String LOG_TAG = "ChromeGcm";
    private static final String EVENT_ACTION_DELETED = "deleted";
    private static final String EVENT_ACTION_MESSAGE = "message";
    private static final String EVENT_ACTION_SEND_ERROR = "send_error";
    private static final String DATA_PAYLOAD = "Payload";

    private static BackgroundEventHandler<ChromeGcm> eventHandler;

    AtomicInteger msgId = new AtomicInteger();
    GoogleCloudMessaging gcm;

    static BackgroundEventHandler<ChromeGcm> getEventHandler() {
        if (eventHandler == null) {
            eventHandler = createEventHandler();
        }
        return eventHandler;
    }

    private static BackgroundEventHandler<ChromeGcm> createEventHandler() {

        return new BackgroundEventHandler<ChromeGcm>() {

            @Override
            protected BackgroundEventInfo mapBroadcast(Context context, Intent intent) {

                GoogleCloudMessaging gcm = GoogleCloudMessaging.getInstance(context);
                String messageType = gcm.getMessageType(intent);

                String action = getGcmAction(messageType);

                if (action == null)
                {
                    return null;
                }

                JSONObject payload = extractGcmPayload(intent);

                BackgroundEventInfo event = new BackgroundEventInfo(action);
                event.getData().putString(DATA_PAYLOAD, payload.toString());

                return event;
            }

            @Override
            protected void mapEventToMessage(BackgroundEventInfo event, JSONObject message) throws JSONException {

                message.put("action", event.action);

                String payloadContent = event.getData().getString(DATA_PAYLOAD);

                if (EVENT_ACTION_MESSAGE.equals(event.action)) {
                    JSONObject messageData = new JSONObject();
                    messageData.put("data", new JSONObject(payloadContent));
                    //messageData.put("collapseKey", ???);
                    message.put("message", messageData);
                } else if (EVENT_ACTION_SEND_ERROR.equals(event.action)) {
                    JSONObject error = new JSONObject();
                    error.put("messageId", "1"); // TODO: Should not hard-code message id?
                    error.put("errorMessage", payloadContent);
                    //error.put("details", ???);
                    message.put("error", error);
                }
            }
        };
    }

    private static JSONObject extractGcmPayload(Intent intent) {
        JSONObject payload = new JSONObject();
        try {
            for (String key : intent.getExtras().keySet()) {
                // Ignore system/framework/gcm extras
                if (
                        key.startsWith("google") ||
                                key.equals("android.support.content.wakelockid") ||
                                key.equals("collapse_key") ||
                                key.equals("from")
                        ) {
                    continue;
                }

                // Everything else is treated as part of the message payload (if any)
                payload.put(key, intent.getStringExtra(key));
            }
        } catch (JSONException e) {
            Log.e(LOG_TAG, "Error parsing GCM payload: " + e);
            return null;
        }
        return payload;
    }

    private static String getGcmAction(String messageType) {
        String action = null;
        if (GoogleCloudMessaging.MESSAGE_TYPE_SEND_ERROR.equals(messageType)) {
            action = ChromeGcm.EVENT_ACTION_SEND_ERROR;
        } else if (GoogleCloudMessaging.MESSAGE_TYPE_DELETED.equals(messageType)) {
            action = ChromeGcm.EVENT_ACTION_DELETED;
        } else if (GoogleCloudMessaging.MESSAGE_TYPE_MESSAGE.equals(messageType)) {
            action = ChromeGcm.EVENT_ACTION_MESSAGE;
        }
        return action;
    }

    @Override
    public void pluginInitialize() {
        getEventHandler().pluginInitialize(this);
    }

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("getRegistrationId".equals(action)) {
            getRegistrationId(args, callbackContext);
            return true;
        } else if ("send".equals(action)) {
            sendMessage(args, callbackContext);
            return true;
        } else if ("unregister".equals(action)) {
            unregister(args, callbackContext);
            return true;
        }

        if (getEventHandler().pluginExecute(this, action, args, callbackContext)) {
            return true;
        }

        return false;
    }

    private void unregister(final CordovaArgs args, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
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
        cordova.getThreadPool().execute(new Runnable() {
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
        cordova.getThreadPool().execute(new Runnable() {
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
