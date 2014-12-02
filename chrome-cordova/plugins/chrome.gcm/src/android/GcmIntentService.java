// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import android.app.IntentService;
import android.content.Intent;

public class GcmIntentService extends IntentService {
    String LOG_TAG ="GcmIntentService";
    public GcmIntentService() {
        super("GcmIntentService");
    }

    @Override
    protected void onHandleIntent(Intent intent) {
        ChromeGcm.getEventHandler().handleBroadcast(getBaseContext(), intent);
        GcmReceiver.completeWakefulIntent(intent);
    }
}
