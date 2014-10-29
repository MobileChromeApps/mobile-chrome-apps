// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import org.apache.cordova.PluginResult;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import java.util.ArrayList;

public class ChromeAlarms extends CordovaPlugin {
    private static final String LOG_TAG = "ChromeAlarms";
    private static final String MAIN_ACTIVITY_LABEL = "ChromeAlarms.MainActivity";
    private static ChromeAlarms pluginInstance;
    private static ArrayList<String> alarmsToFire = new ArrayList<String>();
    private AlarmManager alarmManager;
    private CallbackContext messageChannel;

    public static void triggerAlarm(Context context, Intent intent) {
        int idIdx = intent.getAction().indexOf(".ALARM.");
        String alarmId = intent.getAction().substring(idIdx + 7);

        if (pluginInstance != null && pluginInstance.messageChannel != null) {
            Log.w(LOG_TAG, "Firing alarm to already running webview");
            pluginInstance.sendFireAlarmMessage(alarmId);
        } else {
            alarmsToFire.add(alarmId);
            if (pluginInstance == null) {
                Intent activityIntent = Intent.makeMainActivity((ComponentName)intent.getParcelableExtra(MAIN_ACTIVITY_LABEL));
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
        alarmManager = (AlarmManager) cordova.getActivity().getSystemService(Context.ALARM_SERVICE);
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
        } else if ("clear".equals(action)) {
            clear(args, callbackContext);
            return true;
        } else if ("messageChannel".equals(action)) {
            messageChannel = callbackContext;
            for (String alarmId : alarmsToFire) {
                sendFireAlarmMessage(alarmId);
            }
            alarmsToFire.clear();
            return true;
        }

        return false;
    }

    private void sendFireAlarmMessage(String alarmId) {
        PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, "f" + alarmId);
        pluginResult.setKeepCallback(true);
        messageChannel.sendPluginResult(pluginResult);
    }

    private PendingIntent makePendingIntentForAlarm(final String name, int flags) {
        Intent activityIntent = new Intent(cordova.getActivity().getIntent());
        activityIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        Intent broadcastIntent = new Intent(cordova.getActivity(), ChromeAlarmsReceiver.class);
        // Use different actions for different alarm names so that PendingIntent.getBroadcast returns different PendingIntents for
        // alarms with different names but replaces existing PendingIntents with a new one if one exists with the same name.
        broadcastIntent.setAction(cordova.getActivity().getPackageName() + ".ALARM." + name);
        broadcastIntent.putExtra(MAIN_ACTIVITY_LABEL, cordova.getActivity().getIntent().getComponent());
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
            String alarmId = args.getString(0);
            long scheduledTime = (long) args.getDouble(1);
            long periodInMillis = (long) (args.optDouble(2)*60000);
            PendingIntent alarmPendingIntent = makePendingIntentForAlarm(alarmId, PendingIntent.FLAG_CANCEL_CURRENT);
            alarmManager.cancel(alarmPendingIntent);
            if (periodInMillis == 0) {
                alarmManager.set(AlarmManager.RTC_WAKEUP, scheduledTime, alarmPendingIntent);
            } else {
                alarmManager.setRepeating(AlarmManager.RTC_WAKEUP, scheduledTime, periodInMillis, alarmPendingIntent);
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
