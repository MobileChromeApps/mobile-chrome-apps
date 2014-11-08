/*
 * Copyright 2014 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.uribeacon.scan.compat;

import android.app.IntentService;
import android.content.Intent;

/**
 * The ScanWakefulService Class is called with a WakeLock held, and executes a single Bluetooth LE
 * scan cycle. It then calls the {@link ScanWakefulBroadcastReceiver#completeWakefulIntent} with the
 * same intent to release the associated WakeLock.
 */
public class ScanWakefulService extends IntentService {

  public ScanWakefulService() {
    super("ScanWakefulService");
  }

  @Override
  protected void onHandleIntent(Intent intent) {

    // This method runs in a worker thread.
    // At this point ScanWakefulBroadcastReceiver is still holding a WakeLock.
    // We can do whatever we need to do in the code below.
    // After the call to completeWakefulIntent the WakeLock is released.
    try {
      BluetoothLeScannerCompat bleScanner =
          BluetoothLeScannerCompatProvider.getBluetoothLeScannerCompat(this);
      if (bleScanner != null && bleScanner instanceof JbBluetoothLeScannerCompat) {
        ((JbBluetoothLeScannerCompat) bleScanner).blockingScanCycle();
      }
    } finally {
      ScanWakefulBroadcastReceiver.completeWakefulIntent(intent);
    }
  }
}
