// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;

import org.chromium.apps.ChromeAppsApiTests.MainActivity;


public class BackgroundActivity extends Activity
{
    private static final String LOG_TAG = "BackgroundActivity";
    private static Intent activityIntent;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // This is called only when launchBackground() is first called, and this is the activity
        // at the top of the MainActivity sandwich.
        super.onCreate(savedInstanceState);
        Log.i(LOG_TAG, "onCreate called (finishing)");
        moveTaskToBack(true);
        activityIntent = null;
        finish();
    }


    private static ComponentName findMainActivityComponentName(Context context) {
        PackageManager pm = context.getPackageManager();
        PackageInfo packageInfo = null;
        try {
            packageInfo = pm.getPackageInfo(context.getPackageName(), PackageManager.GET_ACTIVITIES);
        } catch (PackageManager.NameNotFoundException e) {
            throw new RuntimeException("No package info for " + context.getPackageName(), e);
        }

        for (ActivityInfo activityInfo : packageInfo.activities) {
            if ((activityInfo.flags & ActivityInfo.FLAG_EXCLUDE_FROM_RECENTS) == 0) {
                return new ComponentName(packageInfo.packageName, activityInfo.name);
            }
        }
        throw new RuntimeException("Could not find main activity");
    }

    public static void launchBackground(Context context) {
        if (activityIntent != null) {
            Log.w(LOG_TAG, "launchBackground when intent in-progress");
            return; // Activity is already scheduled to start.
        }
        // In order to launch the activity without the user noticing, we send 3 intents:
        // 1 - Create a new task stack with BackgroundActivity at the root.
        //     - It uses a separate affinity, excludeFromRecents, and a NO_UI theme.
        // 2 - Launch the MainActivity ontop of that in the stack. The stack's recents / theme are
        //     taken from the root activity.
        // 3 - Create a second BackgroundActivity instance ontop of that, which calls moveTaskToBack()
        //     and finish()es itself during onCreate.
        //     - This part is implemented as an activity only to avoid needing to add a moveTaskToBack()
        //       call to MainActivity.
        //
        // Note that the activity from #1 never actually gets created. It just gets an entry in the
        // task stack.
        //
        // To verify the state of the task stacks, use:
        //     adb shell dumpsys activity activities
        activityIntent = new Intent(context, BackgroundActivity.class);
        activityIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_FROM_BACKGROUND | Intent.FLAG_ACTIVITY_NO_ANIMATION);

        ComponentName foregroundActivityComponent = findMainActivityComponentName(context);
        Intent intent2 = new Intent(context, MainActivity.class);
        intent2.setAction(Intent.ACTION_MAIN);
        intent2.addCategory(Intent.CATEGORY_LAUNCHER);
        intent2.setFlags(Intent.FLAG_FROM_BACKGROUND);
        Log.w(LOG_TAG, "Starting background activity.");

        Intent intent3 = new Intent(context, BackgroundActivity.class);

        context.startActivities(new Intent[]{activityIntent, intent2, intent3});
    }

    public static void launchForeground(Context context) {
        // Prevent onLaunched from being fired when the app is resumed in this manner.
        if (BackgroundPlugin.pluginInstance != null) {
            BackgroundPlugin.pluginInstance.appResumedFromPlugin = true;
        }
        // We could use an arguably more efficient way of launching the main activity when we know
        // that the BackgroundActivity is running. However, since the user can start the activity
        // from the launcher when it's running in the background, it's better to simulate a launcher
        // intent here in order to keep both flows working in the same way.

        // The RESET_TASK_IF_NEEDED flag causes the MainActivity to be re-parented to this new task
        // if it is already running within the BackgroundActivity task stack. This flag is also present
        // when the launcher launches the app. If the BackgroundActivity task stack does exist,
        // BackgroundAppMainActivity doesn't end up at the top of the stack, and so it never actually
        // gets instantiated.

        Intent intent = new Intent(context, BackgroundAppMainActivity.class);
        intent.setAction(Intent.ACTION_MAIN);
        intent.addCategory(Intent.CATEGORY_LAUNCHER);
        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);

        Log.i(LOG_TAG, "Starting foreground activity.");
        context.startActivity(intent);
    }
}
