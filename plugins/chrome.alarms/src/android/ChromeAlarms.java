// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import org.chromium.Alarm;

import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import org.apache.cordova.Config;

public class ChromeAlarms extends CordovaPlugin {

    public static final String ALARM_NAME_LABEL = "alarmName";
    private static final String LOG_TAG = "ChromeAlarms";
    private static CordovaWebView webView;
    private AlarmManager alarmManager;

    public static void triggerAlarm(Context context, Intent intent) {
        if (webView != null) {
            String name = intent.getStringExtra(ALARM_NAME_LABEL);
            String javascript = "chrome.alarms.triggerAlarm('" + name + "')";
            webView.sendJavascript(javascript);
        } else {
            intent.addFlags(Intent.FLAG_FROM_BACKGROUND);
            context.startActivity(intent);
        }
    }

    @Override
    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
        super.initialize(cordova,  webView);
        if (ChromeAlarms.webView == null && cordova.getActivity().getIntent().hasExtra(ALARM_NAME_LABEL)) {
            cordova.getActivity().moveTaskToBack(true);
        }
        ChromeAlarms.webView = webView;
        alarmManager = (AlarmManager) cordova.getActivity().getSystemService(Context.ALARM_SERVICE);
    }

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("create".equals(action)) {
            create(args, callbackContext);
            return true;
        } else if ("clear".equals(action)) {
            clear(args, callbackContext);
            return true;
        }

        return false;
    }

    private PendingIntent makePendingIntentForAlarm(final String name, int flags) {
        Intent activityIntent = new Intent(cordova.getActivity().getIntent());
        activityIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        activityIntent.putExtra(ALARM_NAME_LABEL, name);
        Intent broadcastIntent = new Intent(cordova.getActivity(), AlarmReceiver.class);
        // Use different actions for different alarm names so that PendingIntent.getBroadcast returns different PendingIntents for
        // alarms with different names but replaces existing PendingIntents with a new one if one exists with the same name.
        broadcastIntent.setAction(cordova.getActivity().getPackageName() + ".ALARM." + name);
        broadcastIntent.putExtra(AlarmReceiver.startIntent, activityIntent);
        return PendingIntent.getBroadcast(cordova.getActivity(), 0, broadcastIntent, flags);
    }

    private void cancelAlarm(final String name) {
        PendingIntent pendingIntent = makePendingIntentForAlarm(name, PendingIntent.FLAG_NO_CREATE);
        if (pendingIntent != null) {
            alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();
        }
    }

    private void create(final CordovaArgs args, final CallbackContext callbackContext) {
        try {
            String name = args.getString(0);
            Alarm alarm = new Alarm(name, (long) args.getDouble(1), (long) (args.optDouble(2)*60000));
            PendingIntent alarmPendingIntent = makePendingIntentForAlarm(name, PendingIntent.FLAG_CANCEL_CURRENT);
            alarmManager.cancel(alarmPendingIntent);
            if (alarm.periodInMillis == 0) {
                alarmManager.set(AlarmManager.RTC_WAKEUP, alarm.scheduledTime, alarmPendingIntent);
            } else {
                alarmManager.setRepeating(AlarmManager.RTC_WAKEUP, alarm.scheduledTime, alarm.periodInMillis, alarmPendingIntent);
            }
            callbackContext.success();
        } catch (Exception e) {
            Log.e(LOG_TAG, "Could not create alarm", e);
            callbackContext.error("Could not create alarm");
        }
    }

    private void clear(final CordovaArgs args, final CallbackContext callbackContext) {
        try {
            JSONArray alarmNames = args.getJSONArray(0);
            for (int i = 0; i < alarmNames.length(); i++) {
                cancelAlarm(alarmNames.getString(i));
            }
            callbackContext.success();
        } catch (Exception e) {
            Log.e(LOG_TAG, "Could not clear alarm", e);
            callbackContext.error("Could not create alarm");
        }
    }
}
