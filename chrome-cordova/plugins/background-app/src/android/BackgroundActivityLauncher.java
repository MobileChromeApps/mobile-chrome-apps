// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;

public class BackgroundActivityLauncher
{
    private static final String LOG_TAG = "BackgroundActivityLauncher";
    private static final String EXTRA_ACTIVITY_FOR_BACKGROUND_EVENTS = "MainActivityForBackgroundEvents";
    private static final String EXTRA_STARTED_FOR_EVENT = "StartedFromBackgroundEvent";
    private static Intent activityIntent;


    private static PackageInfo getPackageInfo(Context context) {
        PackageManager pm = context.getPackageManager();
        try {
            return pm.getPackageInfo(context.getPackageName(), PackageManager.GET_ACTIVITIES);
        } catch (PackageManager.NameNotFoundException e) {
            throw new RuntimeException("No package info for " + context.getPackageName(), e);
        }
    }

    // Allow apps to define their own Background Activity if they want.
    private static ComponentName findBackgroundActivityComponentName(Context context) {
        PackageInfo packageInfo = getPackageInfo(context);

        for (ActivityInfo activityInfo : packageInfo.activities) {
            if (activityInfo.name.contains("Background")) {
                return new ComponentName(packageInfo.packageName, activityInfo.name);
            }
        }

        return null;
    }

    private static ComponentName findMainActivityComponentName(Context context) {
        PackageInfo packageInfo = getPackageInfo(context);

        for (ActivityInfo activityInfo : packageInfo.activities) {
            if ((activityInfo.flags & ActivityInfo.FLAG_EXCLUDE_FROM_RECENTS) == 0) {
                return new ComponentName(packageInfo.packageName, activityInfo.name);
            }
        }

        return null;
    }


    // Same as Intent.makeMainActivity(), but we avoid this for Gingerbread compatibility.
    private static Intent makeMainActivityIntent(ComponentName componentName) {
        Intent intent = new Intent(Intent.ACTION_MAIN);
        intent.setComponent(componentName);
        intent.addCategory(Intent.CATEGORY_LAUNCHER);
        return intent;
    }

    public static void launchBackground(Context context, Intent intent) {
        if (activityIntent != null) {
            return; // Activity is already scheduled to start.
        }

        ComponentName backgroundActivityComponent = intent.getParcelableExtra(EXTRA_ACTIVITY_FOR_BACKGROUND_EVENTS);

        if (backgroundActivityComponent == null) {
            backgroundActivityComponent = findBackgroundActivityComponentName(context);
        }

        if (backgroundActivityComponent == null) {
            // No custom background activity provided, just use the main activity
            backgroundActivityComponent = findMainActivityComponentName(context);
        }

        activityIntent = makeMainActivityIntent(backgroundActivityComponent);
        activityIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_FROM_BACKGROUND);
        activityIntent.putExtra(EXTRA_STARTED_FOR_EVENT, true);
        context.startActivity(activityIntent);
    }

    public static boolean didStartFromBackgroundEvent(Intent intent) {
        return intent.getBooleanExtra(EXTRA_STARTED_FOR_EVENT, false);
    }

    public static void setupStartFromBackgroundEvent(Intent intent, ComponentName component) {
        intent.putExtra(EXTRA_ACTIVITY_FOR_BACKGROUND_EVENTS, component);
    }
}
