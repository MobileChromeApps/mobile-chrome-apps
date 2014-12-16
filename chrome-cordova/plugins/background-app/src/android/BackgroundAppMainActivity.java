// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import org.chromium.apps.ChromeAppsApiTests.MainActivity;

public class BackgroundAppMainActivity extends Activity
{
    private static final String LOG_TAG = "BackgroundAppMainActivity";

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.i(LOG_TAG, "onDestroy Called");
    }

    @Override
    protected void onNewIntent(Intent intent) {
        Log.i(LOG_TAG, "onNewIntent Called (finishing)");
        super.onNewIntent(intent);

        // Following code is attempting to reset the task so that:
        // realActivity=$PACKAGE/.MainActivity instead of $PACKAGE/.BackgroundAppMainActivity
        // However, it works only the first time! If you start the app, then swipe it away,
        // then start the app again, it will still have realActivity=$PACKAGE/.BackgroundAppMainActivity
        // So, we shelve this for now and just call finish(). Not sure what the implications are.

//        Intent launchIntent3 = new Intent(this, MainActivity.class);
//        launchIntent3.setAction(Intent.ACTION_MAIN);
//        launchIntent3.addCategory(Intent.CATEGORY_LAUNCHER);
//        launchIntent3.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED | Intent.FLAG_ACTIVITY_CLEAR_TOP);
//        startActivity(launchIntent3);
        finish();
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // When the user starts from the launcher:
        // 1. If a task stack already exists, it is focus'ed and not changed (e.g. MainActivity remains ontop)
        //    - In this case, onNewIntent is *not* called, and the only way to know that we're in the
        //      foreground now is to listen for onResume() from within the plugin.
        // 2. If a task stack doesn't exist, this method is called.
        if (BackgroundPlugin.pluginInstance != null) {
            // When re-parenting occurs, the MainActivity is ontop of us. When MainActivity finish()es,
            // we are revealed. Checking pluginInstance works to detect this case because the order
            // of callbacks is: MainActivity.onPause(), BackgroundAppMainActivity.onCreate(), MainActivity.onDestroy()
            Log.i(LOG_TAG, "onCreate Called - Finishing since a MainActivity currently exists");
            finish();
        } else {
            Log.i(LOG_TAG, "onCreate Called - Create a new activity since none currently exists.");

            Intent intent1 = new Intent(this, MainActivity.class);
            intent1.setAction(Intent.ACTION_MAIN);

            // Get rid if the BackgroundAppMainActivity so that only the MainActivity exists on the
            // task stack. Calling finish() from here stops the launch animation, so instead, we
            // call it from onNewIntent().
            // You might think we could use a third CLEAR_TOP intent, but that just crashes things.
            // To review, what works is:
            // 1. Use FLAG_ACTIVITY_REORDER_TO_FRONT to swap the order of the two activities and cause
            //    onNewIntent() to fire.
            // 2. Call finish() from within onNewIntent()
            Intent intent2 = new Intent(this, BackgroundAppMainActivity.class);
            intent2.setAction(Intent.ACTION_MAIN);
            intent2.addCategory(Intent.CATEGORY_LAUNCHER);
            // It seems that this doesn't work 100% of the time. E.g. Swipe close app, re-launch,
            // repeat and it doesn't work 2nd time.
            intent2.setFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);

            startActivities(new Intent[]{intent1, intent2});
        }
    }
}
