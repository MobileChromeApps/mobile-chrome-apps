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
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.ParcelUuid;
import android.util.Log;

public class ChromeBluetooth extends CordovaPlugin {

  private static final String LOG_TAG = "ChromeBluetooth";

  private Set<String> tempDevices = new HashSet<String>();
  private Set<String> foundDevices = new HashSet<String>();
  private Set<String> connectedDevices = new HashSet<String>();

  private BluetoothAdapter bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();

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
    webView.getContext().unregisterReceiver(deviceReceiver);
  }

  @Override
  public void onDestroy() {
    super.onDestroy();
    webView.getContext().unregisterReceiver(adapterStateReceiver);
    webView.getContext().unregisterReceiver(deviceReceiver);
  }

  @Override
  public void initialize(CordovaInterface cordova, CordovaWebView webView) {
    super.initialize(cordova, webView);
    registerAdapterStateReceiver();
    registerDeviceReceiver();
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

  @SuppressLint("NewApi")
  private JSONObject getDeviceInfo(BluetoothDevice device) throws JSONException {

    JSONObject deviceInfo = new JSONObject();
    deviceInfo.put("address", device.getAddress());
    deviceInfo.put("name", device.getName());
    deviceInfo.put("deviceClass", device.getBluetoothClass().getDeviceClass());
    deviceInfo.put("paired", device.getBondState() == BluetoothDevice.BOND_BONDED);
    deviceInfo.put("connected", connectedDevices.contains(device.getAddress()));

    ParcelUuid[] uuids = device.getUuids();
    if (uuids != null) {
      List<String> uuidStrings = new ArrayList<String>(uuids.length);
      for(ParcelUuid uuid : uuids) {
        uuidStrings.add(uuid.toString()) ;
      }
      deviceInfo.put("uuids", uuidStrings);
    }

    return deviceInfo;
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

    if (bluetoothAdapter.isDiscovering())
      return;

    registerDiscoveryReceiver();

    if (bluetoothAdapter.startDiscovery()) {
      callbackContext.success();
    }
  }

  private void stopDiscovery(CallbackContext callbackContext) {
    webView.getContext().unregisterReceiver(discoveryReceiver);
    if (bluetoothAdapter.cancelDiscovery()) {
      callbackContext.success();
    }
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

  private void registerDeviceReceiver() {
    IntentFilter deviceFilter = new IntentFilter();
    deviceFilter.addAction(BluetoothDevice.ACTION_ACL_CONNECTED);
    deviceFilter.addAction(BluetoothDevice.ACTION_ACL_DISCONNECTED);
    deviceFilter.addAction(BluetoothDevice.ACTION_BOND_STATE_CHANGED);
    deviceFilter.addAction(BluetoothDevice.ACTION_FOUND);
    webView.getContext().registerReceiver(deviceReceiver, deviceFilter);
  }

  private void registerDiscoveryReceiver() {
    IntentFilter discoveryFilter = new IntentFilter();
    discoveryFilter.addAction(BluetoothAdapter.ACTION_DISCOVERY_STARTED);
    discoveryFilter.addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);
    webView.getContext().registerReceiver(discoveryReceiver, discoveryFilter);
  }

  private final BroadcastReceiver adapterStateReceiver = new BroadcastReceiver() {
      @Override
      public void onReceive(Context context, Intent intent) {
        if (BluetoothAdapter.ACTION_STATE_CHANGED.equals(intent.getAction())) {
          sendAdapterStateChangedEvent();
        }
      }
    };

  private final BroadcastReceiver deviceReceiver = new BroadcastReceiver() {
      @Override
      public void onReceive(Context context, Intent intent) {
        final String action = intent.getAction();
        BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
        if (BluetoothDevice.ACTION_FOUND.equals(action)) {
          tempDevices.add(device.getAddress());
          if (foundDevices.add(device.getAddress())) {
            sendDeviceAddedEvent(device);
          }
        } else if (BluetoothDevice.ACTION_ACL_CONNECTED.equals(action)) {
          connectedDevices.add(device.getAddress());
          sendDeviceChangedEvent(device);
        } else if (BluetoothDevice.ACTION_ACL_DISCONNECTED.equals(action)) {
          connectedDevices.remove(device.getAddress());
          sendDeviceChangedEvent(device);
        } else if (BluetoothDevice.ACTION_BOND_STATE_CHANGED.equals(action)) {
          sendDeviceChangedEvent(device);
        }
      }
    };

  private final BroadcastReceiver discoveryReceiver = new BroadcastReceiver() {
      @Override
      public void onReceive(Context context, Intent intent) {
        final String action = intent.getAction();
        if (BluetoothAdapter.ACTION_DISCOVERY_STARTED.equals(action)) {
          tempDevices.clear();
        } else if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(action)) {
          Set<String> removedDevices = new HashSet<String>(foundDevices);
          removedDevices.removeAll(tempDevices);
          for (String removedDeviceAddress : removedDevices) {
            sendDeviceRemovedEvent(removedDeviceAddress);
          }

          foundDevices.removeAll(removedDevices);
          bluetoothAdapter.startDiscovery();
        }
      }
    };
}
