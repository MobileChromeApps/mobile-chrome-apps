// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.json.JSONException;
import org.json.JSONObject;

import android.content.Intent;
import android.util.Log;

public class BackgroundPlugin extends CordovaPlugin {
    private static final String LOG_TAG = "BackgroundPlugin";
    private static final String ACTION_SWITCH_TO_FOREGROUND = "switchforeground";

    // This reference lets us know whether or not the app is currently running.
    static BackgroundPlugin pluginInstance;
    private CallbackContext messageChannel;
    private boolean runningInBackground;
    private boolean switchToForegroundQueued;
    boolean appResumedFromPlugin;

    @Override
    public void pluginInitialize() {
        if (pluginInstance != null) {
            // Possible that we could learn to support it by having a map of pluginInstance->MainActivity.class
            throw new IllegalStateException("org.chromium.backgroundapp does not support multiple CordovaActivity instances");
        }
        pluginInstance = this;
        runningInBackground = ((cordova.getActivity().getIntent().getFlags() & Intent.FLAG_FROM_BACKGROUND) == Intent.FLAG_FROM_BACKGROUND);
    }

    @Override
    public void onReset() {
        messageChannel = null;
        releasePluginMessageChannels();
    }

    @Override
    public void onResume(boolean multitasking) {
        // onResume is called for the first time when an Intent causes MainActivity to show.
        // This is pretty much our first clue that we have been shown (since we don't receive
        final boolean shouldKillActivities = appResumedFromPlugin || runningInBackground;
        final boolean shouldFireOnLaunch = runningInBackground && !appResumedFromPlugin;
        appResumedFromPlugin = false;
        runningInBackground = false;

        if (shouldKillActivities) {
            // Kill off the BackgroundActivity task stack. Leaving it around causes the next call
            // to BackgroundActivity.launchBackground() to have MainActivity in the wrong task stack.
            final Intent intent1 = new Intent(webView.getContext(), BackgroundActivity.class);
            intent1.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);

            final Intent intent2 = new Intent(webView.getContext(), BackgroundAppMainActivity.class);
            intent2.setAction(Intent.ACTION_MAIN);
            intent2.addCategory(Intent.CATEGORY_LAUNCHER);
            intent2.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);

            cordova.getThreadPool().execute(new Runnable() {
                @Override
                public void run() {
                    cordova.getActivity().runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            Log.i(LOG_TAG, "Killing background activity now that foreground is alive");

                            //webView.getContext().startActivities(new Intent[] {intent1, intent2});
                            webView.getContext().startActivity(intent1);
                        }
                    });
                }
            });

            cordova.getThreadPool().execute(new Runnable() {
                @Override
                public void run() {
                    // This one isn't working :(. The intent doesn't seem to do anything.
                    // Without this working, it seems that when you activate the task switcher,
                    // the app disappears (as if moveToBack() was called).
                    // Perhaps it's the case that REORDER_TO_FRONT works only when the activity
                    // is instantiated (as opposed to just being an entry on the task stack).
                    try
                    {
                        Thread.sleep(1000);
                    }catch (Exception e) {}
                    cordova.getActivity().runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            Log.i(LOG_TAG, "Killing BackgroundActivityMain now that foreground is alive");
                            webView.getContext().getApplicationContext().startActivity(intent2);
                        }
                    });
                }
            });
        }
        if (shouldFireOnLaunch) {
            // This code is necessary since resuming the app from the launcher brings the app to the
            // foreground, but does not deliver any new intent. The lack of intent is due to MainActivity
            // being ontop of BackgroundAppMainActivity. We could also potentially fix this by setting
            // BackgroundAppMainActivity to being of type normal instead of SingleTop.
            Log.i(LOG_TAG, "Firing onLaunched from plugin");
            if (messageChannel != null) {
                sendEventMessage(ACTION_SWITCH_TO_FOREGROUND);
            } else {
                switchToForegroundQueued = true;
            }
        }
    }

    @Override
    public void onDestroy() {
        messageChannel = null;
        pluginInstance = null;
        releasePluginMessageChannels();
    }

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("messageChannel".equals(action)) {
            messageChannel = callbackContext;
            if (switchToForegroundQueued) {
                switchToForegroundQueued = false;
                sendEventMessage(ACTION_SWITCH_TO_FOREGROUND);
            }
            return true;
        }
        return false;
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
    }

    private void sendEventMessage(String action) {
        JSONObject obj = new JSONObject();
        try {
            obj.put("action", action);
        } catch (JSONException e) {
            Log.e(LOG_TAG, "Failed to create background event", e);
        }
        PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, obj);
        pluginResult.setKeepCallback(true);
        messageChannel.sendPluginResult(pluginResult);
    }

    private static void releasePluginMessageChannels() {
        // Release the message channel for all plugins using our background event handler
        //  - The Cordova Plugin framework does not provide a direct way to handle the life cycle
        //    events for plugins (e.g. onReset, onDestroy)
        //  - To avoid extra boilerplate in any plugin using the event handler, will cleanup all
        //    the message channels for plugins here
        BackgroundEventHandler.releaseMessageChannels();
    }
}
