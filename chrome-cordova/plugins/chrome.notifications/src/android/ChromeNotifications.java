// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaResourceApi;
import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.app.Notification;
import android.app.PendingIntent;
import android.app.NotificationManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.support.v4.app.NotificationCompat;
import android.support.v4.content.IntentCompat;
import android.text.Html;
import android.util.Log;

import java.io.InputStream;
import java.util.Iterator;
import java.util.List;
import java.util.ArrayList;

public class ChromeNotifications extends CordovaPlugin {
    private static final String LOG_TAG = "ChromeNotifications";
    private static final String INTENT_PREFIX = "ChromeNotifications.";
    private static final String MAIN_ACTIVITY_LABEL = INTENT_PREFIX + "MainActivity";
    private static final String NOTIFICATION_CLICKED_ACTION = INTENT_PREFIX + "Click";
    private static final String NOTIFICATION_CLOSED_ACTION = INTENT_PREFIX + "Close";
    private static final String NOTIFICATION_BUTTON_CLICKED_ACTION = INTENT_PREFIX + "ButtonClick";

    private static ChromeNotifications pluginInstance;
    private static List<EventInfo> pendingEvents = new ArrayList<EventInfo>();
    private NotificationManager notificationManager;
    private CallbackContext messageChannel;


    private static class EventInfo {
        public String action;
        public String notificationId;
        public int buttonIndex;

        public EventInfo(String action, String notificationId, int buttonIndex) {
            this.action = action;
            this.notificationId = notificationId;
            this.buttonIndex = buttonIndex;
        }
    }

    public static void handleNotificationAction(Context context, Intent intent) {
        String[] strings = intent.getAction().split("\\|", 3);
        int buttonIndex = strings.length >= 3 ? Integer.parseInt(strings[2]) : -1;

        if (pluginInstance != null && pluginInstance.messageChannel != null) {
            Log.w(LOG_TAG, "Firing notification to already running webview");
            pluginInstance.sendNotificationMessage(strings[0], strings[1], buttonIndex);
        } else {
            pendingEvents.add(new EventInfo(strings[0], strings[1], buttonIndex));
            if (pluginInstance == null) {
                Intent activityIntent = IntentCompat.makeMainActivity((ComponentName)intent.getParcelableExtra(MAIN_ACTIVITY_LABEL));
                activityIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_FROM_BACKGROUND);
                activityIntent.putExtra(MAIN_ACTIVITY_LABEL, MAIN_ACTIVITY_LABEL);
                context.startActivity(activityIntent);
            }
        }
    }

    @Override
    public void pluginInitialize() {
        if (pluginInstance == null && cordova.getActivity().getIntent().hasExtra(MAIN_ACTIVITY_LABEL)) {
            cordova.getActivity().moveTaskToBack(true);
        }
        pluginInstance = this;
        notificationManager = (NotificationManager) cordova.getActivity().getSystemService(Context.NOTIFICATION_SERVICE);
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
        if ("create".equals(action)) {
            create(args, callbackContext);
            return true;
        } else if ("update".equals(action)) {
            update(args, callbackContext);
            return true;
        } else if ("clear".equals(action)) {
            clear(args, callbackContext);
            return true;
        } else if ("messageChannel".equals(action)) {
            messageChannel = callbackContext;
            for (EventInfo event : pendingEvents) {
                sendNotificationMessage(event.action, event.notificationId, event.buttonIndex);
            }
            pendingEvents.clear();
            return true;
        }
        return false;
    }

    private void sendNotificationMessage(String action, String notificationId, int buttonIndex) {
        JSONObject obj = new JSONObject();
        try {
            obj.put("action", action.substring(INTENT_PREFIX.length()));
            obj.put("id", notificationId);
            if (NOTIFICATION_BUTTON_CLICKED_ACTION.equals(action)) {
                obj.put("buttonIndex", buttonIndex);
            }
        } catch (JSONException e) {
        }
        PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, obj);
        pluginResult.setKeepCallback(true);
        messageChannel.sendPluginResult(pluginResult);
    }

    private PendingIntent getExistingNotification(String notificationId) {
        return makePendingIntent(NOTIFICATION_CLICKED_ACTION, notificationId, -1, PendingIntent.FLAG_NO_CREATE);
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

    private void makeNotification(String notificationId, JSONObject options) throws JSONException {
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

    private void updateNotification(String notificationId, JSONObject updateOptions, JSONObject originalOptions) throws JSONException {
        JSONObject mergedOptions;

        if (originalOptions == null) {
            mergedOptions = updateOptions;
        } else {
            // Merge the update options with those previously used to create the notification
            mergedOptions = originalOptions;
            Iterator iterator = updateOptions.keys();
            while (iterator.hasNext()) {
                String key = (String) iterator.next();
                mergedOptions.put(key, updateOptions.get(key));
            }
        }

        makeNotification(notificationId, mergedOptions);
    }

    private void create(final CordovaArgs args, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    makeNotification(args.getString(0), args.getJSONObject(1));
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
                    String notificationId = args.getString(0);
                    PendingIntent existingNotification = getExistingNotification(notificationId);

                    if (existingNotification != null) {
                        updateNotification(notificationId, args.getJSONObject(1), args.optJSONObject(2));
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
            PendingIntent pendingIntent = getExistingNotification(notificationId);

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
