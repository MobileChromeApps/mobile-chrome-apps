// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class PushMessageReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        ChromePushMessaging.handlePushMessage(context, intent);
    }
}
