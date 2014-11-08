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

import org.uribeacon.scan.util.Clock;
import org.uribeacon.scan.util.Logger;
import org.uribeacon.scan.util.SystemClock;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.content.Context;
import android.content.Intent;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Implements Bluetooth LE scan related API on top of
 * {@link android.os.Build.VERSION_CODES#JELLY_BEAN_MR2} and later.
 * <p>
 * This class delivers a callback on found, updated, and lost for devices matching a
 * {@link ScanFilter} filter during scan cycles.
 * <p>
 * A scan cycle comprises a period when the Bluetooth Adapter is active and a period when the
 * Bluetooth adapter is idle. Having an idle period is energy efficient for long lived scans.
 * <p>
 * This class can be accessed on multiple threads:
 * <ul>
 * <li> main thread (user) can call any of the BluetoothLeScanner APIs
 * <li> IntentService worker thread can call {@link #blockingScanCycle}
 * <li> AIDL binder thread can call {@link #leScanCallback.onLeScan}
 * </ul>
 *
 * @see <a href="http://go/ble-glossary">BLE Glossary</a>
 */
class JbBluetoothLeScannerCompat extends BluetoothLeScannerCompat {
  // Number of cycles before a sighted device is considered lost.
  /* @VisibleForTesting */ static final int SCAN_LOST_CYCLES = 4;

  // Constants for Scan Cycle
  // Low Power: 2.5 minute period with 1.5 seconds active (1% duty cycle)
  /* @VisibleForTesting */ static final int LOW_POWER_IDLE_MILLIS = 148500;
  /* @VisibleForTesting */ static final int LOW_POWER_ACTIVE_MILLIS = 1500;

  // Balanced: 15 second period with 1.5 second active (10% duty cycle)
  /* @VisibleForTesting */ static final int BALANCED_IDLE_MILLIS = 13500;
  /* @VisibleForTesting */ static final int BALANCED_ACTIVE_MILLIS = 1500;

  // Low Latency: 1.67 second period with 1.5 seconds active (90% duty cycle)
  /* @VisibleForTesting */ static final int LOW_LATENCY_IDLE_MILLIS = 167;
  /* @VisibleForTesting */ static final int LOW_LATENCY_ACTIVE_MILLIS = 1500;

  /**
   * Wraps user requests and stores the list of filters and callbacks. Also saves a set of
   * addresses for which any of the filters have matched in order to do lost processing.
   */
  private static class ScanClient {
    final List<ScanFilter> filtersList;
    final Set<String> addressesSeen;
    final ScanCallback callback;
    final ScanSettings settings;

    ScanClient(ScanSettings settings, List<ScanFilter> filters, ScanCallback callback) {
      this.settings = settings;
      this.filtersList = filters;
      this.addressesSeen = new HashSet<String>();
      this.callback = callback;
    }
  }

  // Alarm Scan variables
  private final Clock clock;
  private final AlarmManager alarmManager;
  private final PendingIntent alarmIntent;
  private long alarmIntervalMillis;

  // Map of BD_ADDR->ScanResult for replay to new registrations.
  // Entries are evicted after SCAN_LOST_CYCLES cycles.
  /* @VisibleForTesting */ final HashMap<String, ScanResult> recentScanResults;

  // Default Scan Constants = Balanced
  private int scanIdleMillis = BALANCED_IDLE_MILLIS;
  private int scanActiveMillis = BALANCED_ACTIVE_MILLIS;

  // Override values for scan window
  private int overrideScanActiveMillis = -1;
  private int overrideScanIdleMillis;

  // Milliseconds to wait before considering a device lost. If set to a negative number
  // SCAN_LOST_CYCLES is used to determine when to inform clients about lost events.
  private long scanLostOverrideMillis = -1;

  private final BluetoothAdapter bluetoothAdapter;
  /* @VisibleForTesting */ final HashMap<ScanCallback, ScanClient> serialClients;

  /**
   * The Bluetooth LE callback which will be registered with the OS,
   * to be fired on device discovery.
   */
  private final BluetoothAdapter.LeScanCallback leScanCallback =
      new BluetoothAdapter.LeScanCallback() {
    /**
     * Callback method called from the OS on each BLE device sighting.
     * This method is invoked on the AIDL handler thread, so all methods
     * called here must be synchronized.
     *
     * @param device The device discovered
     * @param rssi The signal strength in dBm it was received at
     * @param scanRecordBytes The raw byte payload buffer
     */
    @Override
    public void onLeScan(BluetoothDevice device, int rssi, byte[] scanRecordBytes) {
      long currentTimeInNanos = TimeUnit.MILLISECONDS.toNanos(clock.currentTimeMillis());
      ScanResult result = new ScanResult(device, ScanRecord.parseFromBytes(scanRecordBytes), rssi,
          currentTimeInNanos);
      onScanResult(device.getAddress(), result);
    }
  };

  /**
   * Package constructor, called from {@link BluetoothLeScannerCompatProvider}.
   */
  JbBluetoothLeScannerCompat(
      Context context, BluetoothManager manager, AlarmManager alarmManager) {
    this(manager, alarmManager, new SystemClock(),
        PendingIntent.getBroadcast(context, 0 /* requestCode */,
            new Intent(context, ScanWakefulBroadcastReceiver.class), 0 /* flags */));
  }

  /**
   * Testing constructor for the scanner.
   *
   * @VisibleForTesting
   */
  JbBluetoothLeScannerCompat(BluetoothManager manager, AlarmManager alarmManager,
      Clock clock, PendingIntent alarmIntent) {
    this.bluetoothAdapter = manager.getAdapter();
    this.serialClients = new HashMap<ScanCallback, ScanClient>();
    this.recentScanResults = new HashMap<String, ScanResult>();
    this.alarmManager = alarmManager;
    this.alarmIntent = alarmIntent;
    this.clock = clock;
  }

  /**
   * The entry point blockingScanCycle executes a BLE Scan cycle and is called from the
   * ScanWakefulService. When this method ends, the service will signal the ScanWakefulBroadcast
   * receiver to release its wakelock and the phone will enter a sleep phase for the remainder of
   * the BLE scan cycle.
   * <p>
   * This is called on the IntentService handler thread and hence is synchronized.
   * <p>
   * Suppresses the experimental 'wait not in loop' warning because we don't mind exiting early.
   * Suppresses deprecation because this is the compatibility support.
   */
  @SuppressWarnings({"WaitNotInLoop", "deprecation"})
  synchronized void blockingScanCycle() {
    Logger.logDebug("Starting BLE Active Scan Cycle.");
    int activeMillis = getScanActiveMillis();
    if (activeMillis > 0) {
      bluetoothAdapter.startLeScan(leScanCallback);
      // Sleep for the duration of the scan. No wakeups are expected, but catch is required.
      try {
        wait(activeMillis);
      } catch (InterruptedException e) {
        Logger.logError("Exception in ScanCycle Sleep", e);
      } finally {
        try {
          bluetoothAdapter.stopLeScan(leScanCallback);
        } catch (NullPointerException e) {
          // An NPE is thrown if Bluetooth has been reset since this blocking scan began.
          Logger.logDebug("NPE thrown in BlockingScanCycle");
        }
        // Active BLE scan ends
        // Execute cycle complete to 1) detect lost devices
        onScanCycleComplete();
      }
    }
    Logger.logDebug("Stopping BLE Active Scan Cycle.");
  }

  private void callbackLostLeScanClients(String address, ScanResult result) {
    for (ScanClient client : serialClients.values()) {
      int wantAny = client.settings.getCallbackType() & ScanSettings.CALLBACK_TYPE_ALL_MATCHES;
      int wantLost = client.settings.getCallbackType() & ScanSettings.CALLBACK_TYPE_MATCH_LOST;

      if (client.addressesSeen.remove(address) && (wantAny | wantLost) != 0) {

        // Catch any exceptions and log them but continue processing other scan results.
        try {
          client.callback.onScanResult(ScanSettings.CALLBACK_TYPE_MATCH_LOST, result);
        } catch (Exception e) {
          Logger.logError("Failure while sending 'lost' scan result to listener", e);
        }
      }
    }
  }

  /**
   * Process a single scan result, sending it directly
   * to any active listeners who want to know.
   *
   * @VisibleForTesting
   */
  void onScanResult(String address, ScanResult result) {
    callbackLeScanClients(address, result);
  }

  /**
   * Distribute each scan record to registered clients. When a "found" event occurs record the
   * address in the client filter so we can later send the "lost" event to that same client.
   * <P>
   * This method will be called by the AIDL handler thread from onLeScan.
   */
  private synchronized void callbackLeScanClients(String address, ScanResult result) {
    for (ScanClient client : serialClients.values()) {
      if (matchesAnyFilter(client.filtersList, result)) {
        boolean seenItBefore = client.addressesSeen.contains(address);
        int clientFlags = client.settings.getCallbackType();
        int firstMatchBit = clientFlags & ScanSettings.CALLBACK_TYPE_FIRST_MATCH;
        int allMatchesBit = clientFlags & ScanSettings.CALLBACK_TYPE_ALL_MATCHES;

        // Catch any exceptions and log them but continue processing other listeners.
        if ((firstMatchBit | allMatchesBit) != 0) {
          try {
            if (!seenItBefore) {
              client.callback.onScanResult(ScanSettings.CALLBACK_TYPE_FIRST_MATCH, result);
            } else if (allMatchesBit != 0) {
              client.callback.onScanResult(ScanSettings.CALLBACK_TYPE_ALL_MATCHES, result);
            }
          } catch (Exception e) {
            Logger.logError("Failure while handling scan result", e);
          }
        }
        if (!seenItBefore) {
          client.addressesSeen.add(address);
        }
      }
    }

    recentScanResults.put(address, result);
  }

  @Override
  public synchronized boolean startScan(List<ScanFilter> filterList, ScanSettings settings,
      ScanCallback callback) {
    return startSerialScan(settings, filterList, callback);
  }

  private boolean startSerialScan(ScanSettings settings, List<ScanFilter> filterList,
      ScanCallback callback) {
    ScanClient client = new ScanClient(settings, filterList, callback);
    serialClients.put(callback, client);

    int clientFlags = client.settings.getCallbackType();
    int firstMatchBit = clientFlags & ScanSettings.CALLBACK_TYPE_FIRST_MATCH;
    int allMatchesBit = clientFlags & ScanSettings.CALLBACK_TYPE_ALL_MATCHES;

    // Process new registrations by immediately invoking the "found" callback
    // with all previously sighted devices.
    if ((firstMatchBit | allMatchesBit) != 0) {
      for (Entry<String, ScanResult> entry : recentScanResults.entrySet()) {
        String address = entry.getKey();
        ScanResult savedResult = entry.getValue();
        if (matchesAnyFilter(filterList, savedResult)) {

          // Catch any exceptions and log them but continue processing other scan results.
          try {
            client.callback.onScanResult(ScanSettings.CALLBACK_TYPE_FIRST_MATCH, savedResult);
          } catch (Exception e) {
            Logger.logError("Failure while handling scan result for new listener", e);
          }
          client.addressesSeen.add(address);
        }
      }
  }

    updateRepeatingAlarm();
    return true;
  }

  /**
   * Global override for scan window. This separately supersedes settings from all scan clients.
   *
   * @param scanMillis -1 to remove override, 0 to pause scan, or a positive number
   * @param idleMillis a positive number
   * @param serialScanDurationMillis not used in this scanner
   */
  @Override
  public synchronized void setCustomScanTiming(
      int scanMillis, int idleMillis, long serialScanDurationMillis) {
    overrideScanActiveMillis = scanMillis;
    overrideScanIdleMillis = idleMillis;
    // reset scanner so it picks up new scan window values
    updateRepeatingAlarm();
  }

  /**
   * Sets the time after which a sighted device will be marked as lost.
   */
  @Override
  public synchronized void setScanLostOverride(long scanLostOverrideMillis) {
    this.scanLostOverrideMillis = scanLostOverrideMillis;
  }

  /**
   * Stop scanning.
   *
   * @see JbBluetoothLeScannerCompat#startScan
   */
  @Override
  public synchronized void stopScan(ScanCallback callback) {
    serialClients.remove(callback);
    updateRepeatingAlarm();
  }

  /**
   * Test for lost tags by periodically checking the found devices
   * for any that haven't been seen recently.
   *
   * @VisibleForTesting
   */
  void onScanCycleComplete() {
    Iterator<Map.Entry<String, ScanResult>> iter = recentScanResults.entrySet().iterator();
    long lostTimestampMillis = getLostTimestampMillis();

    // Clear out any expired notifications from the "old sightings" record.
    while (iter.hasNext()) {
      Map.Entry<String, ScanResult> entry = iter.next();
      String address = entry.getKey();
      ScanResult savedResult = entry.getValue();
      if (TimeUnit.NANOSECONDS.toMillis(savedResult.getTimestampNanos()) < lostTimestampMillis) {
        callbackLostLeScanClients(address, savedResult);
        iter.remove();
      }
    }
  }

  /**
   * Sets parameters for the various scan modes
   *
   * @param scanMode the ScanMode in BluetoothLeScanner Settings
   */
  private void setScanMode(int scanMode) {
    switch (scanMode) {
      case ScanSettings.SCAN_MODE_LOW_LATENCY:
        scanIdleMillis = LOW_LATENCY_IDLE_MILLIS;
        scanActiveMillis = LOW_LATENCY_ACTIVE_MILLIS;
        break;
      case ScanSettings.SCAN_MODE_LOW_POWER:
        scanIdleMillis = LOW_POWER_IDLE_MILLIS;
        scanActiveMillis = LOW_POWER_ACTIVE_MILLIS;
        break;

      // Fall through and be balanced when there's nothing saying not to.
      default:
      case ScanSettings.SCAN_MODE_BALANCED:
        scanIdleMillis = BALANCED_IDLE_MILLIS;
        scanActiveMillis = BALANCED_ACTIVE_MILLIS;
        break;
    }
  }

  private int getScanModePriority(int mode) {
    switch (mode) {
      case ScanSettings.SCAN_MODE_LOW_LATENCY:
        return 2;
      case ScanSettings.SCAN_MODE_BALANCED:
        return 1;
      case ScanSettings.SCAN_MODE_LOW_POWER:
        return 0;
      default:
        Logger.logError("Unknown scan mode " + mode);
        return 0;
    }
  }

  private int getMaxPriorityScanMode() {
    int maxPriority = -1;

    for (ScanClient scanClient : serialClients.values()) {
      ScanSettings settings = scanClient.settings;
      if (maxPriority == -1
          || getScanModePriority(settings.getScanMode()) > getScanModePriority(maxPriority)) {
        maxPriority = settings.getScanMode();
      }
    }
    return maxPriority;
  }

  /**
   * Update the repeating alarm wake-up based on the period defined for the scanner If there are
   * no clients, or a batch scan running, it will cancel the alarm.
   */
  private void updateRepeatingAlarm() {
    // Apply Scan Mode (Cycle Parameters)
    setScanMode(getMaxPriorityScanMode());

    if (serialClients.isEmpty()) {
      // No listeners.  Remove the repeating alarm, if there is one.
      alarmManager.cancel(alarmIntent);
      alarmIntervalMillis = 0;
      Logger.logInfo("Scan : No clients left, canceling alarm.");
    } else {
      int idleMillis = getScanIdleMillis();
      int scanPeriod = idleMillis + getScanActiveMillis();
      if ((idleMillis != 0) && (alarmIntervalMillis != scanPeriod)) {
        alarmIntervalMillis = scanPeriod;
        // Specifies a repeating alarm at the scanPeriod, starting immediately.
        alarmManager.setRepeating(AlarmManager.RTC_WAKEUP,
            clock.currentTimeMillis(), alarmIntervalMillis,
            alarmIntent);
        Logger.logInfo("Scan alarm setup complete @ " + System.currentTimeMillis());
      }
    }
  }

  private static boolean matchesAnyFilter(List<ScanFilter> filters, ScanResult result) {
    if (filters == null || filters.isEmpty()) {
      return true;
    }
    for (ScanFilter filter : filters) {
      if (filter.matches(result)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Calculates the number of milliseconds since this device was booted up.
   * (Not a value that can be used as a real timestamp, but suitable for comparisons.)
   */
  private long millisecondsSinceBoot() {
    return TimeUnit.NANOSECONDS.toMillis(clock.elapsedRealtimeNanos());
  }

  /**
   * Compute the timestamp in the past which is the earliest that a sighting can have been
   * seen; sightings last seen before this timestamp will be deemed to be too old.
   * Then the Sandmen come.
   *
   * @VisibleForTesting
   */
  long getLostTimestampMillis() {
    if (scanLostOverrideMillis >= 0) {
      return clock.currentTimeMillis() - scanLostOverrideMillis;
    }
    return clock.currentTimeMillis() - (SCAN_LOST_CYCLES * getScanCycleMillis());
  }

  /**
   * Returns the length of a single scan cycle, comprising both active and idle time.
   *
   * @VisibleForTesting
   */
  long getScanCycleMillis() {
    return getScanActiveMillis() + getScanIdleMillis();
  }

  /**
   * Get the current active ble scan time that has been set
   *
   * @VisibleForTesting
   */
  int getScanActiveMillis() {
    return (overrideScanActiveMillis != -1) ? overrideScanActiveMillis : scanActiveMillis;
  }

  /**
   * Get the current idle ble scan time that has been set
   *
   * @VisibleForTesting
   */
  int getScanIdleMillis() {
    return (overrideScanActiveMillis != -1) ? overrideScanIdleMillis : scanIdleMillis;
  }
}
