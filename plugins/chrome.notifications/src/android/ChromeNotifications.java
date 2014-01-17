// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaResourceApi;
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
import java.util.List;
import java.util.ArrayList;
import java.util.concurrent.ExecutorService;

public class ChromeNotifications extends CordovaPlugin {
    private static final String LOG_TAG = "ChromeNotifications";
    private static final String NOTIFICATION_ID_LABEL = "notificationId";
    private static final String NOTIFICATION_ACTION_LABEL = "notificationAction";
    private static final String NOTIFICATION_BUTTON_INDEX_LABEL = "notificationButtonIndex";
    private static final String COMPONENT_NAME_LABEL = "componentName";
    private static final String NOTIFICATION_CLICKED_ACTION = "NOTIFICATION_CLICKED";
    private static final String NOTIFICATION_CLOSED_ACTION = "NOTIFICATION_CLOSED";
    private static final String NOTIFICATION_BUTTON_CLICKED_ACTION = "NOTIFICATION_BUTTON_CLICKED";

    private static CordovaWebView webView;
    private static boolean safeToFireEvents = false;
    private static List<EventInfo> pendingEvents = new ArrayList<EventInfo>();
    private NotificationManager notificationManager;
    private ExecutorService executorService;

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
    
    @Override
    public void initialize(final CordovaInterface cordova, CordovaWebView webView) {
        safeToFireEvents = false;
        super.initialize(cordova, webView);
        notificationManager = (NotificationManager) cordova.getActivity().getSystemService(Context.NOTIFICATION_SERVICE);
        if (ChromeNotifications.webView == null &&
            NOTIFICATION_CLOSED_ACTION.equals(cordova.getActivity().getIntent().getStringExtra(NOTIFICATION_ACTION_LABEL))) {
            // In this case we are starting up the activity again in response to a notification being closed. We do not
            // want to interrupt the user by bringing the activity to the foreground in this case so move it to the
            // background.
            cordova.getActivity().moveTaskToBack(true);
        }
        ChromeNotifications.webView = webView;
        executorService = cordova.getThreadPool();
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
        } else if ("fireStartupEvents".equals(action)) {
            fireStartupEvents(args, callbackContext);
            return true;
        }
        return false;
    }

    public static void handleNotificationAction(Context context, Intent intent) {
        String[] strings = intent.getAction().substring(context.getPackageName().length() + 1).split("\\.", 3);
        int buttonIndex = strings.length >= 3 ? Integer.parseInt(strings[2]) : -1;
        triggerJavascriptEvent(context, (ComponentName) intent.getExtras().getParcelable(COMPONENT_NAME_LABEL),
                               new EventInfo(strings[0], strings[1], buttonIndex));
    }
    
    private static void triggerJavascriptEventNow(Context context, ComponentName componentName, EventInfo eventInfo) {
        Intent intent = new Intent();
        intent.setComponent(componentName);
        intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        if (NOTIFICATION_CLICKED_ACTION.equals(eventInfo.action)) {
            webView.sendJavascript("chrome.notifications.triggerOnClicked('" + eventInfo.notificationId + "')");
            context.startActivity(intent);
        } else if (NOTIFICATION_CLOSED_ACTION.equals(eventInfo.action)) {
            PendingIntent pendingIntent = makePendingIntent(context, componentName, NOTIFICATION_CLICKED_ACTION, eventInfo.notificationId, -1,
                                                            PendingIntent.FLAG_NO_CREATE);
            if (pendingIntent != null) {
                pendingIntent.cancel();
            }
            webView.sendJavascript("chrome.notifications.triggerOnClosed('" + eventInfo.notificationId + "')");
        } else if (NOTIFICATION_BUTTON_CLICKED_ACTION.equals(eventInfo.action)) {
            webView.sendJavascript("chrome.notifications.triggerOnButtonClicked('" + eventInfo.notificationId + "', " + eventInfo.buttonIndex + ")");
            context.startActivity(intent);
        }
    }

    private static void triggerJavascriptEvent(Context context, ComponentName componentName, EventInfo eventInfo) {
        if (webView == null) {
            // In this case the main activity has been closed and will need to be started up again in order to execute
            // the appropriate event handler.
            Intent intent = IntentCompat.makeMainActivity(componentName);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.putExtra(NOTIFICATION_ACTION_LABEL, eventInfo.action);
            intent.putExtra(NOTIFICATION_ID_LABEL, eventInfo.notificationId);
            if (eventInfo.buttonIndex >= 0) {
                intent.putExtra(NOTIFICATION_BUTTON_INDEX_LABEL, eventInfo.buttonIndex);
            }
            pendingEvents.add(eventInfo);
            context.startActivity(intent);
            return;
        } else if (!safeToFireEvents) {
            // In this case the activity has been started up but initialization has not completed so the javascript is not
            // yet ready to run event handlers, so queue the event until javascript is ready.
            pendingEvents.add(eventInfo);
            return;
        }
        // This is the "normal" case in which the main activity is still around and ready to execute event handlers
        // in javascript immediately. The activity may not necessarily be in the foreground so we still need to send
        // an intent that brings it to the foreground if the notification or a notification button was clicked.
        triggerJavascriptEventNow(context, componentName, eventInfo);
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
        return makePendingIntent(cordova.getActivity(), cordova.getActivity().getIntent().getComponent(), action, notificationId, buttonIndex, flags);
    }

    static public PendingIntent makePendingIntent(Context context, ComponentName componentName, String action, String notificationId,
                                                  int buttonIndex, int flags) {
        Intent intent = new Intent(context, NotificationReceiver.class);
        String fullAction = context.getPackageName() + "." + action + "." + notificationId;
        if (buttonIndex >= 0) {
            fullAction += "." + buttonIndex;
        }
        intent.setAction(fullAction);
        intent.putExtra(COMPONENT_NAME_LABEL, componentName);
        return PendingIntent.getBroadcast(context, 0, intent, flags);
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
            notification = builder.build();
        }
        notificationManager.notify(notificationId.hashCode(), notification);
    }

    private void create(final CordovaArgs args, final CallbackContext callbackContext) {
        executorService.execute(new Runnable() {
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
        executorService.execute(new Runnable() {
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
                notificationManager.cancel(notificationId.hashCode());
                pendingIntent.cancel();
                callbackContext.success(1);
            } else {
                callbackContext.success(0);
            }
        } catch (Exception e) {
            Log.e(LOG_TAG, "Could not clear notification", e);
            callbackContext.error("Could not clear notification");
        }
    }

    private void fireStartupEvents(final CordovaArgs args, final CallbackContext callbackContext) {
        safeToFireEvents = true;
        for (int i = 0; i < pendingEvents.size(); i++) {
            triggerJavascriptEventNow(cordova.getActivity(), cordova.getActivity().getIntent().getComponent(), pendingEvents.get(i));
        }
        pendingEvents.clear();
    }
}

