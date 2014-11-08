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

// THIS IS MODIFIED COPY OF THE "L" PLATFORM CLASS. BE CAREFUL ABOUT EDITS.
// THIS CODE SHOULD FOLLOW ANDROID STYLE.
//
// Changes:
//   Change to abstract class
//   Remove implementations
//   Define setCustomScanTiming for ULR
//   Slight updates to javadoc

package org.uribeacon.scan.compat;

import java.util.List;

/**
 * Represents the public entry into the Bluetooth LE compatibility scanner that efficiently captures
 * advertising packets broadcast from Bluetooth LE devices.
 * <p>
 * API declarations in this class are the same as the new LE scanning API that is being introduced
 * in Android "L" platform. Declarations contained here will eventually be replaced by the platform
 * versions. Refer to the <a href="http://go/android-ble">"L" release API design</a> for further
 * information.
 * <p>
 * The API implemented here is for compatibility when used on
 * {@link android.os.Build.VERSION_CODES#JELLY_BEAN_MR2} and later.
 *
 * @see <a href="https://www.bluetooth.org/en-us/specification/adopted-specifications"> Bluetooth
 *      Adopted Specifications</a>
 * @see <a href="https://www.bluetooth.org/DocMan/handlers/DownloadDoc.ashx?doc_id=282152"> ​Core
 *      Specification Supplement (CSS) v4</a>
 */
public abstract class BluetoothLeScannerCompat {

    /**
     * Start Bluetooth LE scan with default parameters and no filters.
     * The scan results will be delivered through {@code callback}.
     * <p>
     * Requires {@link android.Manifest.permission#BLUETOOTH_ADMIN} permission.
     *
     * @param callback Callback used to deliver scan results.
     * @throws IllegalArgumentException If {@code callback} is null.
     */
    public void startScan(final ScanCallback callback) {
        if (callback == null) {
            throw new IllegalArgumentException("callback is null");
        }
        this.startScan(null, new ScanSettings.Builder().build(), callback);
    }

    /**
     * Starts a scan for Bluetooth LE devices, looking for device advertisements that match the
     * given filters.  Attempts to start scans more than once with the same ScanCallback instance
     * will fail and return {@code false}.
     * <p>
     * Due to the resource limitations in BLE chipset, an app cannot add more than N(real number
     * TBD) filters.
     * <p>
     * Once the controller storage reaches its limitation on scan filters, the framework will try to
     * merge the existing scan filters and set the merged filters to chipset. The framework will
     * need to keep a copy of the original scan filters to make sure each app gets only its desired
     * results.
     * <p>
     * The callback will be invoked when LE scan finds a matching BLE advertising packet. A BLE
     * advertising record is considered matching the filters if it matches any of the
     * BluetoothLeScanFilter in the list.
     * <p>
     * Results of the scan are reported using the onResult(List<ScanResult>) callback.
     * <p>
     * Requires BLUETOOTH_ADMIN permission.
     * <p>
     *
     * @return true if the scan starts successfully, false otherwise.
     */
    public abstract boolean startScan(List<ScanFilter> filters, ScanSettings settings,
            ScanCallback callback);

    /**
     * Stops an ongoing Bluetooth LE device scan.
     * <p>
     * Requires BLUETOOTH_ADMIN permission.
     * <p>
     *
     * @param callback
     */
    public abstract void stopScan(ScanCallback callback);

    /**
     * Sets the Bluetooth LE scan cycle overriding values set on individual scans from
     * {@link ScanSettings}.
     * <p>
     * This is an extension of the "L" Platform API.
     * <p>
     *
     * @param scanMillis duration in milliseconds for the scan to be active, or -1 to remove, 0 to
     *        pause.  Ignored by hardware and truncated batch scanners.
     * @param idleMillis duration in milliseconds for the scan to be idle.  Ignored by hardware
     *        and truncated batch scanners.
     * @param serialScanDurationMillis duration in milliseconds of the on-demand serial scan
     *        launched opportunistically by the truncated batch mode scanner.  Ignored by
     *        non-truncated scanners.
     */
    public abstract void setCustomScanTiming(
        int scanMillis, int idleMillis, long serialScanDurationMillis);

    /**
     * Sets the delay after which a device will be marked as lost if it hasn't been sighted
     * within the given time. Set to a negative value to allow default behaviour.
     */
    public abstract void setScanLostOverride(long lostOverrideMillis);
}
