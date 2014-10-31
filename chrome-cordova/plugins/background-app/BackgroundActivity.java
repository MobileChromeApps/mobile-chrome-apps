// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;

import org.apache.cordova.AndroidWebView;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaActivity;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.LinearLayoutSoftKeyboardDetect;

import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class BackgroundActivity extends CordovaActivity
{
    private static final String LOG_TAG = "BackgroundActivity";
    private static BackgroundActivity activityInstance;
    private static Intent activityIntent;

    DelegatingCordovaInterface delegatingCordovaInterface;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.d(LOG_TAG, "Background Activity onCreate()");
        moveTaskToBack(true);
        delegatingCordovaInterface = new DelegatingCordovaInterface(this);
        activityInstance = this;
        activityIntent = null;
        super.onCreate(savedInstanceState);
        loadUrl(launchUrl);
    }

    @Override
    protected void createViews() {
        // No-op so as to not call setContentView().
    }

    // Method is same as super class except we use the delegatingCordovaInterface and getApplicationContext().
    @Override
    protected CordovaWebView makeWebView() {
        String r = preferences.getString("webView", null);
        CordovaWebView ret = null;
        if (r != null) {
            try {
                Class<?> webViewClass = Class.forName(r);
                Constructor<?> constructor = webViewClass.getConstructor(Context.class);
                ret = (CordovaWebView) constructor.newInstance((Context)this.getApplicationContext());
            } catch (ClassNotFoundException e) {
                e.printStackTrace();
            } catch (InstantiationException e) {
                e.printStackTrace();
            } catch (IllegalAccessException e) {
                e.printStackTrace();
            } catch (IllegalArgumentException e) {
                e.printStackTrace();
            } catch (InvocationTargetException e) {
                e.printStackTrace();
            } catch (NoSuchMethodException e) {
                e.printStackTrace();
            }
        }

        if (ret == null) {
            // If all else fails, return a default WebView
            ret = new AndroidWebView(this);
        }
        ret.init(delegatingCordovaInterface, pluginEntries, internalWhitelist, externalWhitelist, preferences);
        return ret;
    }

    // Allow apps to define their own Background Activity if they want.
    private static ComponentName getBackgroundActivityComponent(Context context) {
        PackageManager pm = context.getPackageManager();
        PackageInfo packageInfo = null;
        try {
            packageInfo = pm.getPackageInfo(context.getPackageName(), PackageManager.GET_ACTIVITIES);
        } catch (PackageManager.NameNotFoundException e) {
            throw new RuntimeException("No package info for " + context.getPackageName(), e);
        }

        for (ActivityInfo activityInfo : packageInfo.activities) {
            if (activityInfo.name.contains("Background")) {
                return new ComponentName(packageInfo.packageName, activityInfo.name);
            }
        }
        return new ComponentName(BackgroundActivity.class.getPackage().toString(), BackgroundActivity.class.getName());
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
        return new ComponentName(BackgroundActivity.class.getPackage().toString(), BackgroundActivity.class.getName());
    }

    // Same as Intent.makeMainActivity(), but we avoid this for Gingerbread compatibility.
    private static Intent makeMainActivityIntent(ComponentName componentName) {
        Intent intent = new Intent(Intent.ACTION_MAIN);
        intent.setComponent(componentName);
        intent.addCategory(Intent.CATEGORY_LAUNCHER);
        return intent;
    }

    public static void launchBackground(Context context) {
        if (activityIntent != null) {
            return; // Activity is already scheduled to start.
        }
        ComponentName backgroundActivityComponent = getBackgroundActivityComponent(context);
        activityIntent = makeMainActivityIntent(backgroundActivityComponent);
        activityIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_FROM_BACKGROUND);
        context.startActivity(activityIntent);
    }

    public static void launchForeground(Context context) {
        ComponentName foregroundActivityComponent = findMainActivityComponentName(context);
        Intent launchIntent = makeMainActivityIntent(foregroundActivityComponent);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        // Use the application context to start this activity
        //  - Using activity.startActivity() doesn't work (error seen in logcat)
        //  - A semi-random activity will be shown instead
        context.getApplicationContext().startActivity(launchIntent);
    }

    public static CordovaWebView stealWebView(CordovaActivity newCordovaActivity) {
        if (activityInstance == null) {
            return null;
        }

        activityInstance.delegatingCordovaInterface.underlying = newCordovaActivity;
        activityInstance.delegatingCordovaInterface.allowStartActivityForResult = true;
        CordovaWebView ret = activityInstance.appView;
        activityInstance.appView = null;
        activityInstance.finish();
        activityInstance = null;
        return ret;
    }

    private class DelegatingCordovaInterface implements CordovaInterface {
        CordovaInterface underlying;
        boolean allowStartActivityForResult;

        DelegatingCordovaInterface(CordovaInterface underlying) {
            this.underlying = underlying;
        }
        @Override
        public void startActivityForResult(CordovaPlugin command, Intent intent, int requestCode) {
            if (!allowStartActivityForResult) {
                // Reason for this is that the hosting activity might change during the intent.
                // Might look at enabling this if there's a real need, but work-around is to just
                // start the real activity first.
                throw new IllegalStateException("Cannot fire intents while app is backgrounded.");
            }
            underlying.startActivityForResult(command, intent, requestCode);
        }

        @Override
        public void setActivityResultCallback(CordovaPlugin plugin) {
            underlying.setActivityResultCallback(plugin);
        }

        @Override
        public Activity getActivity() {
            return underlying.getActivity();
        }

        @Override
        public Object onMessage(String id, Object data) {
            return underlying.getActivity();
        }

        @Override
        public ExecutorService getThreadPool() {
            return underlying.getThreadPool();
        }
    }
}
