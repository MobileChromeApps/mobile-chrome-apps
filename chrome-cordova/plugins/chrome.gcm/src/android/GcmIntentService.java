// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import com.google.android.gms.gcm.GoogleCloudMessaging;

import android.app.IntentService;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import org.json.JSONObject;

public class GcmIntentService extends IntentService {
    String LOG_TAG ="GcmIntentService";
    public GcmIntentService() {
        super("GcmIntentService");
    }

    @Override
    protected void onHandleIntent(Intent intent) {
        JSONObject payload = new JSONObject();
        try {
            for (String key : intent.getExtras().keySet()) {
            	if(!(
                  key.startsWith("google") ||
                  key.equals("android.support.content.wakelockid") ||
                  key.equals("collapse_key") ||
                  key.equals("from"))){
                     payload.put(key, intent.getStringExtra(key));
                }
            }
        } catch (Exception e) {
            Log.e(LOG_TAG, "Error parsing GCM payload: " + e);
            return;
        }
        String payloadString = payload.toString();

        GoogleCloudMessaging gcm = GoogleCloudMessaging.getInstance(this);
        String messageType = gcm.getMessageType(intent);

        ChromeGcm.startApp(this);
        if (GoogleCloudMessaging.MESSAGE_TYPE_SEND_ERROR.equals(messageType)) {
            ChromeGcm.handleSendError( payloadString);
        } else if (GoogleCloudMessaging.MESSAGE_TYPE_DELETED.equals(messageType)) {
            ChromeGcm.handleDeletedMessages( payloadString);
        } else if (GoogleCloudMessaging.MESSAGE_TYPE_MESSAGE.equals(messageType)) {
            ChromeGcm.handleRxMessage( payloadString);
        } else {
//        	Log.w(LOG_TAG, "got msgtype: "+messageType);
        }
        GcmReceiver.completeWakefulIntent(intent);
    }
}
