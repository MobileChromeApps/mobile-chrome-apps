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

import static android.content.Context.ALARM_SERVICE;
import static android.content.Context.BLUETOOTH_SERVICE;

import org.uribeacon.scan.util.Logger;

import android.annotation.TargetApi;
import android.app.AlarmManager;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.content.Context;
import android.os.Build;

import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

import android.support.annotation.Nullable;

/**
 * A compatibility layer for low-energy bluetooth, providing access to an implementation of
 * the {@link BluetoothLeScannerCompat} which will use the Android "L" APIs if they are present,
 * which can leverage the newest BLE hardware; or if running on an older version of the OS,
 * this provider falls back to providing a CPU-bound BLE scanner which has the same feature set.
 * <p/>
 * A {@link BluetoothLeScannerCompat} allows the application to register for callback events for
 * advertising packets broadcast from Bluetooth LE devices.
 */
public class BluetoothLeScannerCompatProvider {

  private static BluetoothLeScannerCompat scannerInstance;
  private static boolean allowHardware = true;

  private BluetoothLeScannerCompatProvider() {
  }

  /**
   * Creates a {@link BluetoothLeScannerCompat} that works with the version of Android being used.
   * <p>
   * For Android versions between Jelly Bean MR2 and "L", a compatibility layer will be used to
   * provide functionality that will be available in "L". For Android versions "L" and later, the
   * native functionality will be used.
   *
   * @param context The Android context of the application.
   * @return A {@link BluetoothLeScannerCompat} best fitting the version of Android. If no scanner
   *         can be found, null will be returned.
   */
  @Nullable
  public static synchronized BluetoothLeScannerCompat getBluetoothLeScannerCompat(Context context) {
    return getBluetoothLeScannerCompat(context, true);
  }

   /**
   * Creates a {@link BluetoothLeScannerCompat}, providing either a compatibility layer or
   * access to native functionality available in "L".
   * <p/>
   *
   * @param context         The Android context of the application.
   * @param canUseNativeApi Whether or not to enable "L" hardware support, if available.
   * @return A {@link BluetoothLeScannerCompat}. If no scanner can be found, null will be returned.
   */
  @Nullable
  public static synchronized BluetoothLeScannerCompat getBluetoothLeScannerCompat(
          Context context, boolean canUseNativeApi) {
    if (scannerInstance == null) {
      BluetoothManager bluetoothManager =
              (BluetoothManager) context.getSystemService(BLUETOOTH_SERVICE);
      AlarmManager alarmManager = (AlarmManager) context.getSystemService(ALARM_SERVICE);

      if (bluetoothManager != null) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.L
                && canUseNativeApi
                && areHardwareFeaturesSupported(bluetoothManager)) {
          scannerInstance = new LBluetoothLeScannerCompat(bluetoothManager);
        } else if (alarmManager != null
                && Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
          scannerInstance = new JbBluetoothLeScannerCompat(
                  context, bluetoothManager, alarmManager);
        }
      }
    }
    return scannerInstance;
  }

  /**
   * Check that the hardware has indeed the features used by the L-specific implementation.
   */
  @TargetApi(Build.VERSION_CODES.JELLY_BEAN_MR2)
  private static boolean areHardwareFeaturesSupported(BluetoothManager bluetoothManager) {
    BluetoothAdapter bluetoothAdapter = bluetoothManager.getAdapter();
    return bluetoothAdapter != null
            && bluetoothAdapter.isOffloadedFilteringSupported()
            && bluetoothAdapter.isOffloadedScanBatchingSupported();
  }
}
