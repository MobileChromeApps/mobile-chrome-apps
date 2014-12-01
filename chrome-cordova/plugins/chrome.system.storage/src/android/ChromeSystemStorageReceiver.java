package org.chromium;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import android.util.Log;

public class ChromeSystemStorageReceiver extends BroadcastReceiver {

    private static final String LOG_TAG = "ChromeSystemStorage";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(LOG_TAG, "Received broadcast: " + intent.toUri(0));
        ChromeSystemStorage.getEventHandler().handleBroadcast(context, intent);
    }
}
