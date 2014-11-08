// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.PluginResult;
import org.apache.cordova.PluginResult.Status;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.uribeacon.scan.compat.BluetoothLeScannerCompat;
import org.uribeacon.scan.compat.BluetoothLeScannerCompatProvider;
import org.uribeacon.scan.compat.ScanCallback;
import org.uribeacon.scan.compat.ScanResult;
import org.uribeacon.scan.compat.ScanSettings;

import android.annotation.TargetApi;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.ParcelUuid;
import android.util.Log;


@TargetApi(Build.VERSION_CODES.JELLY_BEAN_MR2)
public class ChromeBluetooth extends CordovaPlugin {

  private static final String LOG_TAG = "ChromeBluetooth";

  private Set<String> foundDevices = new HashSet<String>();
  private Set<String> connectedDevices = new HashSet<String>();

  private BluetoothAdapter bluetoothAdapter;
  private BluetoothLeScannerCompat leScanner;

  private boolean isLeScanning;

  private CallbackContext adapterStateChangedCallback;
  private CallbackContext deviceAddedCallback;
  private CallbackContext deviceChangedCallback;
  private CallbackContext deviceRemovedCallback;

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
    } else if ("registerAdapterStateChangedEvent".equals(action)) {
      registerAdapterStateChangedEvent(callbackContext);
    } else if ("registerDeviceAddedEvent".equals(action)) {
      registerDeviceAddedEvent(callbackContext);
    } else if ("registerDeviceChangedEvent".equals(action)) {
      registerDeviceChangedEvent(callbackContext);
    } else if ("registerDeviceRemovedEvent".equals(action)) {
      registerDeviceRemovedEvent(callbackContext);
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
  public void initialize(CordovaInterface cordova, CordovaWebView webView) {
    super.initialize(cordova, webView);
    registerAdapterStateReceiver();
    isLeScanning = false;
    bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
    leScanner = BluetoothLeScannerCompatProvider.getBluetoothLeScannerCompat(webView.getContext());
  }

  private JSONObject getAdapterStateInfo() throws JSONException {
    JSONObject stateInfo = new JSONObject();
    stateInfo.put("address", bluetoothAdapter.getAddress());
    stateInfo.put("name", bluetoothAdapter.getName());
    stateInfo.put("powered", bluetoothAdapter.getState() != BluetoothAdapter.STATE_OFF);
    stateInfo.put("available", bluetoothAdapter.isEnabled());
    stateInfo.put("discovering", bluetoothAdapter.isDiscovering());
    return stateInfo;
  }

  private void getAdapterState(CallbackContext callbackContext) throws JSONException {
    callbackContext.success(getAdapterStateInfo());
  }


  private JSONObject getDeviceInfo(String remoteAddress) throws JSONException {
    BluetoothDevice device = bluetoothAdapter.getRemoteDevice(remoteAddress);
    return getDeviceInfo(device);
  }

  private void getDevice(CordovaArgs args, CallbackContext callbackContext) throws JSONException {
    String remoteAddress = args.getString(0);
    callbackContext.success(getDeviceInfo(remoteAddress));
  }

  private void getDevices(CallbackContext callbackContext) throws JSONException {
    JSONArray results = new JSONArray();

    for (String remoteAddress : foundDevices) {
      results.put(getDeviceInfo(remoteAddress));
    }

    callbackContext.success(results);
  }

  private void startDiscovery(CallbackContext callbackContext) {

    // if (bluetoothAdapter.isDiscovering())
    //  return;

    int scanMode = ScanSettings.SCAN_MODE_LOW_LATENCY;

    ScanSettings settings = new ScanSettings.Builder()
        .setCallbackType(ScanSettings.CALLBACK_TYPE_FIRST_MATCH | ScanSettings.CALLBACK_TYPE_MATCH_LOST)
        .setScanMode(scanMode)
        .build();

    if (isLeScanning)
      return;

    if(leScanner.startScan(null, settings, leScanCallback)) {
      isLeScanning = true;
      callbackContext.success();
    }
  }

  private void stopDiscovery(CallbackContext callbackContext) {
    if (isLeScanning) {
      leScanner.stopScan(leScanCallback);
      isLeScanning = false;
      callbackContext.success();
    }
  }

  private JSONObject getDeviceInfo(BluetoothDevice device) throws JSONException {

    JSONObject deviceInfo = new JSONObject();
    deviceInfo.put("address", device.getAddress());
    deviceInfo.put("name", device.getName());
    deviceInfo.put("deviceClass", device.getBluetoothClass().getDeviceClass());
    deviceInfo.put("paired", device.getBondState() == BluetoothDevice.BOND_BONDED);
    deviceInfo.put("connected", connectedDevices.contains(device.getAddress()));

    ParcelUuid[] uuids = device.getUuids();
    if (uuids != null) {
      // TODO: Using a hash set to contain uuids.
      List<String> uuidStrings = new ArrayList<String>(uuids.length);
      for(ParcelUuid uuid : uuids) {
        uuidStrings.add(uuid.toString()) ;
      }

      // TODO: Adding advertisement uuid into device-uuids field as well.
      deviceInfo.put("uuids", uuidStrings);
    }

    return deviceInfo;
  }

  private void registerAdapterStateChangedEvent(CallbackContext callbackContext) {
    adapterStateChangedCallback = callbackContext;
  }

  private void sendAdapterStateChangedEvent() {
    try {
      PluginResult result = new PluginResult(Status.OK, getAdapterStateInfo());
      result.setKeepCallback(true);
      adapterStateChangedCallback.sendPluginResult(result);
    } catch (JSONException e) {
    }
  }

  private void registerDeviceAddedEvent(CallbackContext callbackContext) {
    deviceAddedCallback = callbackContext;
  }

  private void sendDeviceAddedEvent(BluetoothDevice device) {
    try {
      PluginResult result = new PluginResult(Status.OK, getDeviceInfo(device));
      result.setKeepCallback(true);
      deviceAddedCallback.sendPluginResult(result);
    } catch (JSONException e) {
    }
  }

  private void registerDeviceChangedEvent(CallbackContext callbackContext) {
    deviceChangedCallback = callbackContext;
  }

  private void sendDeviceChangedEvent(BluetoothDevice device) {
    try {
      PluginResult result = new PluginResult(Status.OK, getDeviceInfo(device));
      result.setKeepCallback(true);
      deviceChangedCallback.sendPluginResult(result);
    } catch (JSONException e) {
    }
  }

  private void registerDeviceRemovedEvent(CallbackContext callbackContext) {
    deviceRemovedCallback = callbackContext;
  }

  private void sendDeviceRemovedEvent(String remoteAddress) {
    try {
      PluginResult result = new PluginResult(Status.OK, getDeviceInfo(remoteAddress));
      result.setKeepCallback(true);
      deviceRemovedCallback.sendPluginResult(result);
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
        Log.e(LOG_TAG, "test");
        switch (callbackType) {
          case ScanSettings.CALLBACK_TYPE_FIRST_MATCH:
            Log.e(LOG_TAG, "First match: " + result.getDevice().getAddress());
            break;
          case ScanSettings.CALLBACK_TYPE_ALL_MATCHES:
            Log.e(LOG_TAG, "All match: " + result.getDevice().getAddress());
            break;
          case ScanSettings.CALLBACK_TYPE_MATCH_LOST:
            Log.e(LOG_TAG, "Match lost: " + result.getDevice().getAddress());
            break;
        }
      }

      @Override
      public void onBatchScanResults(List<ScanResult> results) {
        Log.e(LOG_TAG, "batch: " + results.toString());
      }

      @Override
      public void onScanFailed(int errorCode) {
        Log.e(LOG_TAG, "scan error");
        // TODO: Do Something
      }
    };
}
