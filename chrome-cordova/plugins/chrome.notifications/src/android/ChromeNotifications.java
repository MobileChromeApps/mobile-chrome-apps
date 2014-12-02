// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaResourceApi;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.app.Notification;
import android.app.PendingIntent;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.support.v4.app.NotificationCompat;
import android.text.Html;
import android.util.Log;

import java.io.InputStream;

public class ChromeNotifications extends CordovaPlugin {
    private static final String LOG_TAG = "ChromeNotifications";
    private static final String INTENT_PREFIX = "ChromeNotifications.";
    private static final String MAIN_ACTIVITY_LABEL = INTENT_PREFIX + "MainActivity";
    private static final String NOTIFICATION_CLICKED_ACTION = INTENT_PREFIX + "Click";
    private static final String NOTIFICATION_CLOSED_ACTION = INTENT_PREFIX + "Close";
    private static final String NOTIFICATION_BUTTON_CLICKED_ACTION = INTENT_PREFIX + "ButtonClick";
    private static final String DATA_NOTIFICATION_ID = "NotificationId";
    private static final String DATA_BUTTON_INDEX = "ButtonIndex";

    private NotificationManager notificationManager;
    private static BackgroundEventHandler<ChromeNotifications> eventHandler;

    public static BackgroundEventHandler<ChromeNotifications> getEventHandler() {
        if (eventHandler == null) {
            eventHandler = createEventHandler();
        }
        return eventHandler;
    }

    private static BackgroundEventHandler<ChromeNotifications> createEventHandler() {

        return new BackgroundEventHandler<ChromeNotifications>() {

            @Override
            public BackgroundEventInfo mapBroadcast(Context context, Intent intent) {
                String[] strings = intent.getAction().split("\\|", 3);
                int buttonIndex = strings.length >= 3 ? Integer.parseInt(strings[2]) : -1;

                BackgroundEventInfo event = new BackgroundEventInfo(strings[0]);
                event.getData().putString(DATA_NOTIFICATION_ID, strings[1]);
                event.getData().putInt(DATA_BUTTON_INDEX, buttonIndex);

                return event;
            }

            @Override
            public void mapEventToMessage(BackgroundEventInfo event, JSONObject message) throws JSONException {
                message.put("action", event.action.substring(INTENT_PREFIX.length()));
                message.put("id", event.getData().getString(DATA_NOTIFICATION_ID));
                if (NOTIFICATION_BUTTON_CLICKED_ACTION.equals(event.action)) {
                    message.put("buttonIndex", event.getData().getInt(DATA_BUTTON_INDEX));
                }
            }
        };
    }

    @Override
    public void pluginInitialize() {
        getEventHandler().pluginInitialize(this);
        notificationManager = (NotificationManager) cordova.getActivity().getSystemService(Context.NOTIFICATION_SERVICE);
    }

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("create".equals(action)) {
            create(args, callbackContext);
            return true;
        } else if ("update".equals(action)) {
            update(args, callbackContext);
            return true;
        } else if ("clear".equals(action)) {
            clear(args, callbackContext);
            return true;
        }

        if (getEventHandler().pluginExecute(this, action, args, callbackContext)) {
            return true;
        }

        return false;
    }

    private boolean doesNotificationExist(String notificationId) {
        return makePendingIntent(NOTIFICATION_CLICKED_ACTION, notificationId, -1, PendingIntent.FLAG_NO_CREATE) != null;
    }

    private Bitmap makeBitmap(String imageUrl, int scaledWidth, int scaledHeight) {
        InputStream largeIconStream;
        try {
            Uri uri = Uri.parse(imageUrl);
            CordovaResourceApi resourceApi = webView.getResourceApi();
            uri = resourceApi.remapUri(uri);
            largeIconStream = resourceApi.openForRead(uri).inputStream;
        } catch (Exception e) {
            Log.e(LOG_TAG, "Failed to open image file " + imageUrl + ": " + e);
            return null;
        }
        Bitmap unscaledBitmap = BitmapFactory.decodeStream(largeIconStream);
        try {
            largeIconStream.close();
        } catch (Exception e) {
            Log.e(LOG_TAG, "Failed to close image file");
        }
        if (scaledWidth != 0 && scaledHeight != 0) {
            return Bitmap.createScaledBitmap(unscaledBitmap, scaledWidth, scaledHeight, false);
        } else {
            return unscaledBitmap;
        }
    }

    public PendingIntent makePendingIntent(String action, String notificationId, int buttonIndex, int flags) {
        Intent intent = new Intent(cordova.getActivity(), ChromeNotificationsReceiver.class);
        String fullAction = action + "|" + notificationId;
        if (buttonIndex >= 0) {
            fullAction += "|" + buttonIndex;
        }
        intent.setAction(fullAction);
        intent.putExtra(MAIN_ACTIVITY_LABEL, cordova.getActivity().getIntent().getComponent());
        return PendingIntent.getBroadcast(cordova.getActivity(), 0, intent, flags);
    }

    private void makeNotification(final CordovaArgs args) throws JSONException {
        String notificationId = args.getString(0);
        JSONObject options = args.getJSONObject(1);
        Resources resources = cordova.getActivity().getResources();
        Bitmap largeIcon = makeBitmap(options.getString("iconUrl"),
                                      resources.getDimensionPixelSize(android.R.dimen.notification_large_icon_width),
                                      resources.getDimensionPixelSize(android.R.dimen.notification_large_icon_height));
        int smallIconId = resources.getIdentifier("notification_icon", "drawable", cordova.getActivity().getPackageName());
        if (smallIconId == 0) {
            smallIconId = resources.getIdentifier("icon", "drawable", cordova.getActivity().getPackageName());
        }
        NotificationCompat.Builder builder = new NotificationCompat.Builder(cordova.getActivity())
            .setSmallIcon(smallIconId)
            .setContentTitle(options.getString("title"))
            .setContentText(options.getString("message"))
            .setLargeIcon(largeIcon)
            .setPriority(options.optInt("priority"))
            .setContentIntent(makePendingIntent(NOTIFICATION_CLICKED_ACTION, notificationId, -1, PendingIntent.FLAG_CANCEL_CURRENT))
            .setDeleteIntent(makePendingIntent(NOTIFICATION_CLOSED_ACTION, notificationId, -1, PendingIntent.FLAG_CANCEL_CURRENT));
        double eventTime = options.optDouble("eventTime");
        if (eventTime != 0) {
            builder.setWhen(Math.round(eventTime));
        }
        JSONArray buttons = options.optJSONArray("buttons");
        if (buttons != null) {
            for (int i = 0; i < buttons.length(); i++) {
                JSONObject button = buttons.getJSONObject(i);
                builder.addAction(android.R.drawable.ic_dialog_info, button.getString("title"),
                                  makePendingIntent(NOTIFICATION_BUTTON_CLICKED_ACTION, notificationId, i, PendingIntent.FLAG_CANCEL_CURRENT));
            }
        }
        String type = options.getString("type");
        Notification notification;
        if ("image".equals(type)) {
            NotificationCompat.BigPictureStyle bigPictureStyle = new NotificationCompat.BigPictureStyle(builder);
            String bigImageUrl = options.optString("imageUrl");
            if (!bigImageUrl.isEmpty()) {
                bigPictureStyle.bigPicture(makeBitmap(bigImageUrl, 0, 0));
            }
            notification = bigPictureStyle.build();
        } else if ("list".equals(type)) {
            NotificationCompat.InboxStyle inboxStyle = new NotificationCompat.InboxStyle(builder);
            JSONArray items = options.optJSONArray("items");
            if (items != null) {
                for (int i = 0; i < items.length(); i++) {
                    JSONObject item = items.getJSONObject(i);
                    inboxStyle.addLine(Html.fromHtml("<b>" + item.getString("title") + "</b>&nbsp;&nbsp;&nbsp;&nbsp;"
                                                     + item.getString("message")));
                }
            }
            notification = inboxStyle.build();
        } else {
            if ("progress".equals(type)) {
                int progress = options.optInt("progress");
                builder.setProgress(100, progress, false);
            }
            NotificationCompat.BigTextStyle bigTextStyle = new NotificationCompat.BigTextStyle(builder);
            bigTextStyle.bigText(options.getString("message"));
            notification = bigTextStyle.build();
        }
        notificationManager.notify(notificationId.hashCode(), notification);
    }

    private void create(final CordovaArgs args, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    makeNotification(args);
                    callbackContext.success();
                } catch (Exception e) {
                    Log.e(LOG_TAG, "Could not create notification", e);
                    callbackContext.error("Could not create notification");
                }
            }
        });
    }

    private void update(final CordovaArgs args, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    if (doesNotificationExist(args.getString(0))) {
                        makeNotification(args);
                        callbackContext.success(1);
                    } else {
                        callbackContext.success(0);
                    }
                } catch (Exception e) {
                    Log.e(LOG_TAG, "Could not update notification", e);
                    callbackContext.error("Could not update notification");
                }
            }
        });
    }

    private void clear(final CordovaArgs args, final CallbackContext callbackContext) {
        try {
            String notificationId = args.getString(0);
            PendingIntent pendingIntent = makePendingIntent(NOTIFICATION_CLICKED_ACTION, notificationId, -1, PendingIntent.FLAG_NO_CREATE);

            if (pendingIntent != null) {
                Log.w(LOG_TAG, "Cancel notification: " + notificationId);
                notificationManager.cancel(notificationId.hashCode());
                pendingIntent.cancel();
                callbackContext.success(1);
            } else {
                Log.w(LOG_TAG, "Cancel notification does not exist: " + notificationId);
                callbackContext.success(0);
            }
        } catch (Exception e) {
            Log.e(LOG_TAG, "Could not clear notification", e);
            callbackContext.error("Could not clear notification");
        }
    }
}
