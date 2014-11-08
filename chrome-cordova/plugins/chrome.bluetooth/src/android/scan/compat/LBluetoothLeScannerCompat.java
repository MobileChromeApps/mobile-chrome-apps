
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

import org.uribeacon.scan.util.Logger;

import android.annotation.TargetApi;
import android.bluetooth.BluetoothManager;
import android.os.Build;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Implements Bluetooth LE scan related API on top of {@link android.os.Build.VERSION_CODES#L}
 * and later.
 */
@TargetApi(Build.VERSION_CODES.L)
class LBluetoothLeScannerCompat extends BluetoothLeScannerCompat {

  private final Map<ScanCallback, android.bluetooth.le.ScanCallback> callbacksMap =
      new HashMap<ScanCallback, android.bluetooth.le.ScanCallback>();
  private final android.bluetooth.le.BluetoothLeScanner osScanner;

  /**
   * Package-protected constructor, used by {@link BluetoothLeScannerCompatProvider}.
   *
   * Cannot be called from emulated devices that don't implement a BluetoothAdapter.
   */
  LBluetoothLeScannerCompat(BluetoothManager manager) {
    Logger.logInfo("BLE 'L' hardware access layer activated");
    this.osScanner = manager.getAdapter().getBluetoothLeScanner();
  }
  
  /** Private constructor for testing purposes. */
  private LBluetoothLeScannerCompat() {
    this.osScanner = null;
  }
  
  /**
   * Returns an instance of this class to tests. Useful only for validating that this file
   * can compile against the underlying L API.
   */
  static LBluetoothLeScannerCompat createForTests() {
    return new LBluetoothLeScannerCompat();
  }

  @Override
  public boolean startScan(List<ScanFilter> filters, ScanSettings settings, ScanCallback callback) {
    if (callbacksMap.containsKey(callback)) {
      Logger.logInfo("StartScan(): BLE 'L' hardware scan already in progress...");
      stopScan(callback);
    }
    
    android.bluetooth.le.ScanSettings osSettings = toOs(settings);
    android.bluetooth.le.ScanCallback osCallback = toOs(callback);
    List<android.bluetooth.le.ScanFilter> osFilters = toOs(filters);

    callbacksMap.put(callback, osCallback);
    try {
      Logger.logInfo("Starting BLE 'L' hardware scan");
      osScanner.startScan(osFilters, osSettings, osCallback);
      return true;
    } catch (Exception e) {
      Logger.logError("Exception caught calling 'L' BluetoothLeScanner.startScan()", e);
      return false;
    }
  }

  @Override
  public void stopScan(ScanCallback callback) {
    android.bluetooth.le.ScanCallback osCallback = callbacksMap.get(callback);

    if (osCallback != null) {
      try {
        Logger.logInfo("Stopping BLE 'L' hardware scan");
        osScanner.stopScan(osCallback);
      } catch (Exception e) {
        Logger.logError("Exception caught calling 'L' BluetoothLeScanner.stopScan()", e);
      }
    }
  }

  @Override
  public void setCustomScanTiming(int scanMillis, int idleMillis, long serialScanDurationMillis) {
    // Do nothing.  This operation is not supported, but calling it is not an error.
  }
  
  @Override
  public synchronized void setScanLostOverride(long lostOverrideMillis) {
    // TODO: discuss w/ bentonian how best to implement this here.
  }

  /////////////////////////////////////////////////////////////////////////////
  // Conversion methods

  private static android.bluetooth.le.ScanSettings toOs(ScanSettings settings) {
    android.bluetooth.le.ScanSettings.Builder builder =
        new android.bluetooth.le.ScanSettings.Builder()
            .setReportDelay(settings.getReportDelayMillis())
            .setScanMode(settings.getScanMode());

    // <hack>
    // Hack to access @SystemApi-hidden method to set scan result type and callback type.
    // Eclipse doesn't recognize these methods (yet). To track changes to this, keep an eye on
    // http://cs/#android/frameworks/base/core/java/android/bluetooth/le/ScanSettings.java
    // TODO: Remove--or at least never commit to gcore.
    Class<?> clazz = builder.getClass();
    boolean resultTypeSet = false;
    boolean callbackTypeSet = false;
    try {
      for (Method method : clazz.getMethods()) {
        if (method.toString().contains(".setScanResultType(")) {
          method.invoke(builder, settings.getScanResultType());
          resultTypeSet = true;
        }
        if (method.toString().contains(".setCallbackType(")) {
          method.invoke(builder, settings.getCallbackType());
          callbackTypeSet = true;
        }
        if (resultTypeSet && callbackTypeSet) {
          break;
        }
      }
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
    if (!resultTypeSet && !callbackTypeSet) {
      throw new RuntimeException(
          "Failed to find setScanResultType() and setCallbackType() via reflection");
    }
    // </hack>

    return builder.build();
  }

  private static android.bluetooth.le.ScanCallback toOs(final ScanCallback callback) {
    return new android.bluetooth.le.ScanCallback() {

      @Override
      public void onScanResult(int callbackType, android.bluetooth.le.ScanResult osResult) {
        callback.onScanResult(callbackType, fromOs(osResult));
      }

      @Override
      public void onScanFailed(int errorCode) {
        Logger.logInfo("LBluetoothLeScannerCompat::onScanFailed(" + errorCode + ")");
        callback.onScanFailed(errorCode);
      }
    };
  }

  private static List<android.bluetooth.le.ScanFilter> toOs(List<ScanFilter> filters) {
    List<android.bluetooth.le.ScanFilter> osFilters =
        new ArrayList<android.bluetooth.le.ScanFilter>(filters.size());
    for (ScanFilter filter : filters) {
      osFilters.add(toOs(filter));
    }
    return osFilters;
  }

  private static android.bluetooth.le.ScanFilter toOs(ScanFilter filter) {
    android.bluetooth.le.ScanFilter.Builder builder = new android.bluetooth.le.ScanFilter.Builder();
    if (!isNullOrEmpty(filter.getDeviceAddress())) {
      builder.setDeviceAddress(filter.getDeviceAddress());
    }
    if (!isNullOrEmpty(filter.getDeviceName())) {
      builder.setDeviceName(filter.getDeviceName());
    }
    if (filter.getManufacturerId() != -1 && filter.getManufacturerData() != null) {
      if (filter.getManufacturerDataMask() != null) {
        builder.setManufacturerData(filter.getManufacturerId(), filter.getManufacturerData(),
            filter.getManufacturerDataMask());
      } else {
        builder.setManufacturerData(filter.getManufacturerId(), filter.getManufacturerData());
      }
    }
    if (filter.getServiceDataUuid() != null && filter.getServiceData() != null) {
      if (filter.getServiceDataMask() != null) {
        builder.setServiceData(
            filter.getServiceDataUuid(), filter.getServiceData(), filter.getServiceDataMask());
      } else {
        builder.setServiceData(filter.getServiceDataUuid(), filter.getServiceData());
      }
    }
    if (filter.getServiceUuid() != null) {
      if (filter.getServiceUuidMask() != null) {
        builder.setServiceUuid(filter.getServiceUuid(), filter.getServiceUuidMask());
      } else {
        builder.setServiceUuid(filter.getServiceUuid());
      }
    }
    return builder.build();
  }

  private static List<ScanResult> fromOs(List<android.bluetooth.le.ScanResult> osResults) {
    List<ScanResult> results = new ArrayList<ScanResult>(osResults.size());
    for (android.bluetooth.le.ScanResult result : osResults) {
      results.add(fromOs(result));
    }
    return results;
  }

  private static ScanResult fromOs(android.bluetooth.le.ScanResult osResult) {
    return new ScanResult(
        osResult.getDevice(),
        fromOs(osResult.getScanRecord()),
        osResult.getRssi(),
        // Convert the osResult timestamp from 'nanos since boot' to 'nanos since epoch'.
        osResult.getTimestampNanos() + getActualBootTimeNanos());
  }

  private static long getActualBootTimeNanos() {
    long currentTimeNanos = TimeUnit.MILLISECONDS.toNanos(System.currentTimeMillis());
    long elapsedRealtimeNanos = android.os.SystemClock.elapsedRealtimeNanos();
    return currentTimeNanos - elapsedRealtimeNanos;
  }

  private static ScanRecord fromOs(android.bluetooth.le.ScanRecord osRecord) {
    return ScanRecord.parseFromBytes(osRecord.getBytes());
  }

  private static boolean isNullOrEmpty(String s) {
    return (s == null) || s.isEmpty();
  }
}
