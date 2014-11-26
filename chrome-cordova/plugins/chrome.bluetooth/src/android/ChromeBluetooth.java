// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.apache.cordova.PluginResult.Status;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.uribeacon.scan.compat.BluetoothLeScannerCompat;
import org.uribeacon.scan.compat.BluetoothLeScannerCompatProvider;
import org.uribeacon.scan.compat.ScanCallback;
import org.uribeacon.scan.compat.ScanRecord;
import org.uribeacon.scan.compat.ScanResult;
import org.uribeacon.scan.compat.ScanSettings;

import android.annotation.TargetApi;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.ParcelUuid;
import android.support.annotation.Nullable;
import android.util.Log;


@TargetApi(Build.VERSION_CODES.JELLY_BEAN_MR2)
public class ChromeBluetooth extends CordovaPlugin {

  private static final String LOG_TAG = "ChromeBluetooth";

  private Map<String, ScanResult> knownLeScanResults = new HashMap<>();

  private BluetoothManager bluetoothManager;
  private BluetoothAdapter bluetoothAdapter;
  private BluetoothLeScannerCompat leScanner;
  private boolean isLeScanning;

  private CallbackContext bluetoothEventsCallback;

  @Override
  public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    if ("getAdapterState".equals(action)) {
      getAdapterState(callbackContext);
    } else if ("getDevice".equals(action)) {
      getDevice(args, callbackContext);
    } else if ("getDevices".equals(action)) {
      getDevices(callbackContext);
    } else if ("startDiscovery".equals(action)) {
      startDiscovery(callbackContext);
    } else if ("stopDiscovery".equals(action)) {
      stopDiscovery(callbackContext);
    } else if ("registerBluetoothEvents".equals(action)) {
      registerBluetoothEvents(callbackContext);
    } else {
      return false;
    }
    return true;
  }

  @Override
  public void onReset() {
    super.onReset();
    webView.getContext().unregisterReceiver(adapterStateReceiver);
  }

  @Override
  public void onDestroy() {
    super.onDestroy();
    webView.getContext().unregisterReceiver(adapterStateReceiver);
  }

  @Override
  protected void pluginInitialize() {
    registerAdapterStateReceiver();
    bluetoothManager = (BluetoothManager) webView.getContext().getSystemService(Context.BLUETOOTH_SERVICE);
    bluetoothAdapter = bluetoothManager.getAdapter();
    leScanner = BluetoothLeScannerCompatProvider.getBluetoothLeScannerCompat(webView.getContext());
    isLeScanning = false;
  }

  @Nullable
  ScanResult getKnownLeScanResults(String deviceAddress) {
    return knownLeScanResults.get(deviceAddress);
  }

  private void setIsLeScanning(boolean isLeScanning) {
    if (this.isLeScanning != isLeScanning) {
      this.isLeScanning = isLeScanning;
      sendAdapterStateChangedEvent();
    }
  }

  private JSONObject getAdapterStateInfo() throws JSONException {
    JSONObject stateInfo = new JSONObject();
    stateInfo.put("address", bluetoothAdapter.getAddress());
    stateInfo.put("name", bluetoothAdapter.getName());
    stateInfo.put("powered", bluetoothAdapter.getState() != BluetoothAdapter.STATE_OFF);
    stateInfo.put("available", bluetoothAdapter.isEnabled());
    stateInfo.put("discovering", isLeScanning);
    return stateInfo;
  }

  private void getAdapterState(CallbackContext callbackContext) throws JSONException {
    callbackContext.success(getAdapterStateInfo());
  }

  private JSONObject getBasicDeviceInfo(BluetoothDevice device) throws JSONException {
    JSONObject deviceInfo = new JSONObject();
    deviceInfo.put("address", device.getAddress());
    deviceInfo.put("name", device.getName());
    deviceInfo.put("deviceClass", device.getBluetoothClass().getDeviceClass());
    deviceInfo.put("paired", device.getBondState() == BluetoothDevice.BOND_BONDED);
    deviceInfo.put(
        "connected",
        bluetoothManager.getConnectedDevices(BluetoothProfile.GATT).contains(device)
        || bluetoothManager.getConnectedDevices(BluetoothProfile.GATT_SERVER).contains(device));
    return deviceInfo;
  }

  private Collection<String> getUuidStringsFromDevice(BluetoothDevice device) {
    Set<String> uuidStrings = new HashSet<>();
    ParcelUuid[] uuids = device.getUuids();
    if (uuids != null) {
      for(ParcelUuid uuid : uuids) {
        uuidStrings.add(uuid.toString()) ;
      }
    }
    return uuidStrings;
  }

  private Collection<String> getUuidStringsFromLeScanRecord(ScanRecord scanRecord) {
    Set<String> uuidStrings = new HashSet<>();
    List<ParcelUuid> uuids = scanRecord.getServiceUuids();
    if (uuids != null) {
      for(ParcelUuid uuid : uuids) {
        uuidStrings.add(uuid.toString());
      }
    }
    return uuidStrings;
  }

  private JSONObject getDeviceInfo(ScanResult leScanResult) throws JSONException {
    JSONObject deviceInfo = getBasicDeviceInfo(leScanResult.getDevice());
    Collection<String> uuidStrings = getUuidStringsFromDevice(leScanResult.getDevice());
    Collection<String> adUuidStrings = getUuidStringsFromLeScanRecord(leScanResult.getScanRecord());
    uuidStrings.addAll(adUuidStrings);

    if (!uuidStrings.isEmpty()) {
      deviceInfo.put("uuids", uuidStrings);
    }

    return deviceInfo;
  }

  private void getDevice(CordovaArgs args, CallbackContext callbackContext) throws JSONException {
    String deviceAddress = args.getString(0);
    ScanResult result = knownLeScanResults.get(deviceAddress);
    if (result == null) {
      callbackContext.error("Invalid Argument");
    } else {
      callbackContext.success(getDeviceInfo(result));
    }
  }

  private void getDevices(CallbackContext callbackContext) throws JSONException {
    JSONArray results = new JSONArray();
    for (ScanResult result: knownLeScanResults.values()) {
      results.put(getDeviceInfo(result));
    }
    callbackContext.success(results);
  }

  private void startDiscovery(CallbackContext callbackContext) {
    if (isLeScanning)
      return;

    int scanMode = ScanSettings.SCAN_MODE_LOW_LATENCY;

    ScanSettings settings = new ScanSettings.Builder()
        .setCallbackType(
            ScanSettings.CALLBACK_TYPE_FIRST_MATCH | ScanSettings.CALLBACK_TYPE_MATCH_LOST)
        .setScanMode(scanMode)
        .build();

    if(leScanner.startScan(null, settings, leScanCallback)) {
      setIsLeScanning(true);
      callbackContext.success();
    } else {
      callbackContext.error("Starting discovery failed");
    }
  }

  private void stopDiscovery(CallbackContext callbackContext) {
    if (isLeScanning) {
      leScanner.stopScan(leScanCallback);
      setIsLeScanning(false);
      callbackContext.success();
    } else {
      callbackContext.error("Failed to stop discovery");
    }
  }

  private void registerBluetoothEvents(CallbackContext callbackContext) {
    bluetoothEventsCallback = callbackContext;
  }

  private static PluginResult getMultipartEventsResult(String eventType, JSONObject info) {
    List<PluginResult> multipartMessage = new ArrayList<>();
    multipartMessage.add(new PluginResult(Status.OK, eventType));
    multipartMessage.add(new PluginResult(Status.OK, info));
    PluginResult result = new PluginResult(Status.OK, multipartMessage);
    result.setKeepCallback(true);
    return result;
  }

  private void sendAdapterStateChangedEvent() {
    try {
      bluetoothEventsCallback.sendPluginResult(
          getMultipartEventsResult("onAdapterStateChanged", getAdapterStateInfo()));
    } catch (JSONException e) {
    }
  }

  private void sendDeviceAddedEvent(ScanResult scanResult) {
    try {
      bluetoothEventsCallback.sendPluginResult(
          getMultipartEventsResult("onDeviceAdded", getDeviceInfo(scanResult)));
    } catch (JSONException e) {
    }
  }

  void sendDeviceChangedEvent(ScanResult scanResult) {
    try {
      bluetoothEventsCallback.sendPluginResult(
          getMultipartEventsResult("onDeviceChanged", getDeviceInfo(scanResult)));
    } catch (JSONException e) {
    }
  }

  private void sendDeviceRemovedEvent(ScanResult scanResult) {
    try {
      List<PluginResult> multipartMessage = new ArrayList<>();
      bluetoothEventsCallback.sendPluginResult(
          getMultipartEventsResult("onDeviceRemoved", getDeviceInfo(scanResult)));
    } catch (JSONException e) {
    }
  }

  private void registerAdapterStateReceiver() {
    IntentFilter filter = new IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED);
    webView.getContext().registerReceiver(adapterStateReceiver, filter);
  }

  private final BroadcastReceiver adapterStateReceiver = new BroadcastReceiver() {
      @Override
      public void onReceive(Context context, Intent intent) {
        if (BluetoothAdapter.ACTION_STATE_CHANGED.equals(intent.getAction())) {
          sendAdapterStateChangedEvent();
        }
      }
    };

  private final ScanCallback leScanCallback = new ScanCallback() {
      @Override
      public void onScanResult(int callbackType, ScanResult result) {
        Log.e(LOG_TAG, "onScanResult():");
        switch (callbackType) {
          case ScanSettings.CALLBACK_TYPE_FIRST_MATCH:
            if (!knownLeScanResults.containsKey(result.getDevice().getAddress())) {
              knownLeScanResults.put(result.getDevice().getAddress(), result);
              sendDeviceAddedEvent(result);
            }
            break;
          case ScanSettings.CALLBACK_TYPE_MATCH_LOST:
            sendDeviceRemovedEvent(result);
            knownLeScanResults.remove(result.getDevice().getAddress());
            break;
        }
      }

      @Override
      public void onScanFailed(int errorCode) {
        Log.e(LOG_TAG, "onScanFailed():");
        setIsLeScanning(false);
      }
    };
}
