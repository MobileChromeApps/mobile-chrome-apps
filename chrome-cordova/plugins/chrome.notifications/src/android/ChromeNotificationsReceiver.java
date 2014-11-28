package org.chromium;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class ChromeNotificationsReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        ChromeNotifications.getEventHandler().handleBroadcast(context, intent);
    }
}
