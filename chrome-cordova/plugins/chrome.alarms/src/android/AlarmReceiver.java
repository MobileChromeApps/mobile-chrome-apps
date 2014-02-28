// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import org.chromium.ChromeAlarms;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class AlarmReceiver extends BroadcastReceiver {
    public static String startIntent = "startIntent";

    @Override
    public void onReceive(Context context, Intent intent) {
        Intent newIntent = (Intent) intent.getParcelableExtra(startIntent);
        ChromeAlarms.triggerAlarm(context, newIntent);
    }
}
