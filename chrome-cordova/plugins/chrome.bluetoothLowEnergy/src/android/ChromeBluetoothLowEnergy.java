package org.chromium;

import java.lang.reflect.Field;
import java.lang.reflect.Method;

import android.annotation.TargetApi;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothProfile;
import android.support.annotation.Nullable;
import android.util.Log;
import android.os.Build;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginManager;
import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.uribeacon.scan.compat.ScanResult;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Semaphore;

import static org.apache.cordova.PluginResult.Status;

@TargetApi(Build.VERSION_CODES.JELLY_BEAN_MR2)
public class ChromeBluetoothLowEnergy extends CordovaPlugin {

  private static final String LOG_TAG = "ChromeBluetoothLowEnergy";
  private Map<String, ChromeBluetoothLowEnergyPeripheral> knownPeripheral =
      new HashMap<String, ChromeBluetoothLowEnergyPeripheral>();
  private CallbackContext bluetoothLowEnergyEventsCallback;

  private PluginManager getPluginManager() {
      PluginManager pm = null;
      try {
          Method gpm = webView.getClass().getMethod("getPluginManager");
          pm = (PluginManager) gpm.invoke(webView);
      } catch (Exception e) {
          try {
              Field pmf = webView.getClass().getField("pluginManager");
              pm = (PluginManager)pmf.get(webView);
          } catch (Exception e2) {}
      }
      return pm;
  }

  @Override
  public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    if ("connect".equals(action)) {
      connect(args, callbackContext);
    } else if ("disconnect".equals(action)) {
      disconnect(args, callbackContext);
    } else if ("getService".equals(action)) {
      getService(args, callbackContext);
    } else if ("getServices".equals(action)) {
      getServices(args, callbackContext);
    } else if ("getCharacteristic".equals(action)) {
      getCharacteristic(args, callbackContext);
    } else if ("getCharacteristics".equals(action)) {
      getCharacteristics(args, callbackContext);
    } else if ("getIncludedServices".equals(action)) {
      getIncludedServices(args, callbackContext);
    } else if ("getDescriptor".equals(action)) {
      getDescriptor(args, callbackContext);
    } else if ("getDescriptors".equals(action)) {
      getDescriptors(args, callbackContext);
    } else if ("readCharacteristicValue".equals(action)) {
      readCharacteristicValue(args, callbackContext);
    } else if ("writeCharacteristicValue".equals(action)) {
      writeCharacteristicValue(args, callbackContext);
    } else if ("startCharacteristicNotifications".equals(action)) {
      startCharacteristicNotifications(args, callbackContext);
    } else if ("stopCharacteristicNotifications".equals(action)) {
      stopCharacteristicNotifications(args, callbackContext);
    } else if ("readDescriptorValue".equals(action)) {
      readDescriptorValue(args, callbackContext);
    } else if ("writeDescriptorValue".equals(action)) {
      writeDescriptorValue(args, callbackContext);
    } else if ("registerBluetoothLowEnergyEvents".equals(action)) {
      registerBluetoothLowEnergyEvents(callbackContext);
    } else {
      return false;
    }
    return true;
  }

  private static String getDeviceAddressFromInstanceId(String instanceId) {
    return instanceId.split("/")[0];
  }

  // Generate a unique identifier for the BluetoothGattService object, the
  // format of the string is based on the dbus's object path in Linux system.
  private static String buildServiceId(String deviceAddress, BluetoothGattService service) {
    return new StringBuilder()
        .append(deviceAddress)
        .append("/")
        .append(service.getUuid().toString())
        .append("_")
        .append(service.getInstanceId())
        .toString();
  }

  // Generate a unique identifier for the BluetoothGattCharacteristic object,
  // the format of the string is based on the dbus's object path in Linux
  // system.
  private static String buildCharacteristicId(
      String deviceAddress, BluetoothGattCharacteristic characteristic) {
    return new StringBuilder()
        .append(deviceAddress)
        .append("/")
        .append(characteristic.getService().getUuid().toString())
        .append("/")
        .append(characteristic.getUuid().toString())
        .append("_")
        .append(characteristic.getInstanceId())
        .toString();
  }

  // Generate a unique identifier for the BluetoothGattDescriptor object, the
  // format of the string is based on the dbus's object path in Linux system.
  private static String buildDescriptorId(
      String deviceAddress, BluetoothGattDescriptor descriptor) {
    return new StringBuilder()
        .append(deviceAddress)
        .append("/")
        .append(descriptor.getCharacteristic().getService().getUuid().toString())
        .append("/")
        .append(descriptor.getCharacteristic().getUuid().toString())
        .append("/")
        .append(descriptor.getUuid().toString())
        .toString();
  }

  private static JSONObject buildServiceInfo(String deviceAddress, BluetoothGattService service)
      throws JSONException {
    JSONObject info = new JSONObject();
    info.put("uuid", service.getUuid().toString());
    info.put("deviceAddress", deviceAddress);
    info.put("instanceId", buildServiceId(deviceAddress, service));
    info.put("isPrimary", service.getType() == BluetoothGattService.SERVICE_TYPE_PRIMARY);
    return info;
  }

  private static JSONArray getPropertyStrings(int properties) throws JSONException {

    JSONArray propertyStrings = new JSONArray();

    if ((BluetoothGattCharacteristic.PROPERTY_BROADCAST & properties) != 0) {
      propertyStrings.put("broadcast");
    }

    if ((BluetoothGattCharacteristic.PROPERTY_EXTENDED_PROPS & properties) != 0) {
      propertyStrings.put("extendedProperties");
    }

    if ((BluetoothGattCharacteristic.PROPERTY_INDICATE & properties) != 0) {
      propertyStrings.put("indicate");
    }

    if ((BluetoothGattCharacteristic.PROPERTY_NOTIFY & properties) != 0) {
      propertyStrings.put("notify");
    }

    if ((BluetoothGattCharacteristic.PROPERTY_READ & properties) != 0) {
      propertyStrings.put("read");
    }

    if ((BluetoothGattCharacteristic.PROPERTY_SIGNED_WRITE & properties) != 0) {
      propertyStrings.put("authenticatedSignedWrites");
    }

    if ((BluetoothGattCharacteristic.PROPERTY_WRITE & properties) != 0) {
      propertyStrings.put("write");
    }

    if ((BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE & properties) != 0) {
      propertyStrings.put("writeWithoutResponse");
    }

    return propertyStrings;
  }

  // Note: The returned object need to be sent in an array or an object as the
  // response of getCharacteristics()/getDescriptor()/getDescriptors(). The
  // "value" field is excluded due to the bridge lacking support for binary
  // data.
  private static JSONObject buildCharacteristicInfo(
      String deviceAddress, BluetoothGattCharacteristic characteristic) throws JSONException {
    JSONObject info = new JSONObject();
    info.put("uuid", characteristic.getUuid().toString());
    info.put("service", buildServiceInfo(deviceAddress, characteristic.getService()));
    info.put("properties", getPropertyStrings(characteristic.getProperties()));
    info.put("instanceId", buildCharacteristicId(deviceAddress, characteristic));
    return info;
  }

  private static List<PluginResult> buildCharacteristicMultipartInfo(
      String deviceAddress, BluetoothGattCharacteristic characteristic) throws JSONException {

    List<PluginResult> multipartInfo = new ArrayList<PluginResult>();
    multipartInfo.add(new PluginResult(Status.OK, characteristic.getUuid().toString()));
    multipartInfo.add(new PluginResult(
        Status.OK, buildServiceInfo(deviceAddress, characteristic.getService())));
    multipartInfo.add(new PluginResult(
        Status.OK, getPropertyStrings(characteristic.getProperties())));
    multipartInfo.add(new PluginResult(
        Status.OK, buildCharacteristicId(deviceAddress, characteristic)));

    if (characteristic.getValue() != null) {
      multipartInfo.add(new PluginResult(Status.OK, characteristic.getValue()));
    }

    return multipartInfo;
  }

  // Note: The result object need to be sent in an array as the response of
  // getDescriptors(). The "value" field is excluded due to the bridge lacking
  // support for binary data.
  private static JSONObject buildDescriptorInfo(
      String deviceAddress, BluetoothGattDescriptor descriptor) throws JSONException {
    JSONObject info = new JSONObject();
    info.put("uuid", descriptor.getUuid().toString());
    info.put(
        "characteristic",
        buildCharacteristicInfo(deviceAddress, descriptor.getCharacteristic()));
    info.put("instanceId", buildDescriptorId(deviceAddress, descriptor));
    return info;
  }

  private static List<PluginResult> buildDescriptorMultipartInfo(
      String deviceAddress, BluetoothGattDescriptor descriptor) throws JSONException {

    List<PluginResult> multipartInfo = new ArrayList<PluginResult>();

    multipartInfo.add(new PluginResult(Status.OK, descriptor.getUuid().toString()));
    multipartInfo.add(new PluginResult(Status.OK, buildCharacteristicInfo(
        deviceAddress, descriptor.getCharacteristic())));
    multipartInfo.add(new PluginResult(Status.OK, buildDescriptorId(deviceAddress, descriptor)));

    if (descriptor.getValue() != null) {
      multipartInfo.add(new PluginResult(Status.OK, descriptor.getValue()));
    }

    return multipartInfo;
  }

  @Nullable
  private ChromeBluetoothLowEnergyPeripheral getPeripheralByDeviceAddress(String deviceAddress) {
    ChromeBluetoothLowEnergyPeripheral peripheral = knownPeripheral.get(deviceAddress);

    if (peripheral != null)
      return peripheral;

    ChromeBluetooth bluetoothPlugin =
        (ChromeBluetooth) getPluginManager().getPlugin("ChromeBluetooth");

    ScanResult bleScanResult = bluetoothPlugin.getKnownLeScanResults(deviceAddress);

    if (bleScanResult == null)
      return null;

    peripheral = new ChromeBluetoothLowEnergyPeripheral(bleScanResult);
    knownPeripheral.put(deviceAddress, peripheral);

    return peripheral;
  }

  private void connect(CordovaArgs args, final CallbackContext callbackContext) throws JSONException {

    String deviceAddress = args.getString(0);

    final ChromeBluetoothLowEnergyPeripheral peripheral = getPeripheralByDeviceAddress(deviceAddress);

    if (peripheral == null) {
      callbackContext.error("Invalid Argument");
      return;
    }

    cordova.getThreadPool().execute(new Runnable() {
        @Override
        public void run() {
          // Ensure connectGatt() is called in serial
          synchronized (ChromeBluetoothLowEnergy.this) {
            try {
              peripheral.connect(callbackContext);
            } catch (InterruptedException e) {
            }
          }
        }
      });
  }

  private void disconnect(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    String deviceAddress = args.getString(0);

    ChromeBluetoothLowEnergyPeripheral peripheral = getPeripheralByDeviceAddress(deviceAddress);

    if (peripheral == null) {
      callbackContext.error("Invalid Argument");
      return;
    }

    peripheral.disconnect(callbackContext);
  }

  private void getService(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    String serviceId = args.getString(0);
    String deviceAddress = getDeviceAddressFromInstanceId(serviceId);

    ChromeBluetoothLowEnergyPeripheral peripheral = getPeripheralByDeviceAddress(deviceAddress);

    if (peripheral == null) {
      callbackContext.error("Invalid Argument");
      return;
    }

    peripheral.getService(serviceId, callbackContext);
  }

  private void getServices(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    String deviceAddress = args.getString(0);

    ChromeBluetoothLowEnergyPeripheral peripheral = getPeripheralByDeviceAddress(deviceAddress);

    if (peripheral == null) {
      callbackContext.error("Invalid Argument");
      return;
    }

    peripheral.getServices(callbackContext);
  }

  private void getCharacteristic(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    String characteristicId = args.getString(0);
    String deviceAddress = getDeviceAddressFromInstanceId(characteristicId);

    ChromeBluetoothLowEnergyPeripheral peripheral = getPeripheralByDeviceAddress(deviceAddress);

    if (peripheral == null) {
      callbackContext.error("Invalid Argument");
      return;
    }

    peripheral.getCharacteristic(characteristicId, callbackContext);
  }

  private void getCharacteristics(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    String serviceId = args.getString(0);
    String deviceAddress = getDeviceAddressFromInstanceId(serviceId);

    ChromeBluetoothLowEnergyPeripheral peripheral = getPeripheralByDeviceAddress(deviceAddress);

    if (peripheral == null) {
      callbackContext.error("Invalid Argument");
      return;
    }

    peripheral.getCharacteristics(serviceId, callbackContext);
  }

  private void getIncludedServices(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    String serviceId = args.getString(0);
    String deviceAddress = getDeviceAddressFromInstanceId(serviceId);

    ChromeBluetoothLowEnergyPeripheral peripheral = getPeripheralByDeviceAddress(deviceAddress);

    if (peripheral == null) {
      callbackContext.error("Invalid Argument");
      return;
    }

    peripheral.getIncludedServices(serviceId, callbackContext);
  }

  private void getDescriptor(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    String descriptorId = args.getString(0);
    String deviceAddress = getDeviceAddressFromInstanceId(descriptorId);

    ChromeBluetoothLowEnergyPeripheral peripheral = getPeripheralByDeviceAddress(deviceAddress);

    if (peripheral == null) {
      callbackContext.error("Invalid Argument");
      return;
    }

    peripheral.getDescriptor(descriptorId, callbackContext);
  }

  private void getDescriptors(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    String characteristicId = args.getString(0);
    String deviceAddress = getDeviceAddressFromInstanceId(characteristicId);

    ChromeBluetoothLowEnergyPeripheral peripheral = getPeripheralByDeviceAddress(deviceAddress);

    if (peripheral == null) {
      callbackContext.error("Invalid Argument");
      return;
    }

    peripheral.getDescriptors(characteristicId, callbackContext);
  }

  private void readCharacteristicValue(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    final String characteristicId = args.getString(0);
    String deviceAddress = getDeviceAddressFromInstanceId(characteristicId);

    final ChromeBluetoothLowEnergyPeripheral peripheral = getPeripheralByDeviceAddress(deviceAddress);

    if (peripheral == null) {
      callbackContext.error("Invalid Argument");
      return;
    }

    cordova.getThreadPool().execute(new Runnable() {
        public void run() {
          peripheral.readCharacteristicValue(characteristicId, callbackContext);
        }
      });
  }

  private void writeCharacteristicValue(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    final String characteristicId = args.getString(0);
    String deviceAddress = getDeviceAddressFromInstanceId(characteristicId);
    final byte[] value = args.getArrayBuffer(1);

    final ChromeBluetoothLowEnergyPeripheral peripheral = getPeripheralByDeviceAddress(deviceAddress);

    if (peripheral == null) {
      callbackContext.error("Invalid Argument");
      return;
    }

    cordova.getThreadPool().execute(new Runnable() {
        public void run() {
          peripheral.writeCharacteristicValue(characteristicId, value, callbackContext);
        }
      });
  }

  private void startCharacteristicNotifications(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    final String characteristicId = args.getString(0);
    String deviceAddress = getDeviceAddressFromInstanceId(characteristicId);

    final ChromeBluetoothLowEnergyPeripheral peripheral = getPeripheralByDeviceAddress(deviceAddress);

    if (peripheral == null) {
      callbackContext.error("Invalid Argument");
      return;
    }

    cordova.getThreadPool().execute(new Runnable() {
        public void run() {
          peripheral.setCharacteristicNotification(characteristicId, true, callbackContext);
        }
      });
  }

  private void stopCharacteristicNotifications(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    final String characteristicId = args.getString(0);
    String deviceAddress = getDeviceAddressFromInstanceId(characteristicId);

    final ChromeBluetoothLowEnergyPeripheral peripheral = getPeripheralByDeviceAddress(deviceAddress);

    if (peripheral == null) {
      callbackContext.error("Invalid Argument");
      return;
    }

    cordova.getThreadPool().execute(new Runnable() {
        public void run() {
          peripheral.setCharacteristicNotification(characteristicId, false, callbackContext);
        }
      });
  }

  private void readDescriptorValue(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    final String descriptorId = args.getString(0);
    String deviceAddress = getDeviceAddressFromInstanceId(descriptorId);

    final ChromeBluetoothLowEnergyPeripheral peripheral = getPeripheralByDeviceAddress(deviceAddress);

    if (peripheral == null) {
      callbackContext.error("Invalid Argument");
      return;
    }

    cordova.getThreadPool().execute(new Runnable() {
        public void run() {
          peripheral.readDescriptorValue(descriptorId, callbackContext);
        }
      });
  }

  private void writeDescriptorValue(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    final String descriptorId = args.getString(0);
    String deviceAddress = getDeviceAddressFromInstanceId(descriptorId);
    final byte[] value = args.getArrayBuffer(1);

    final ChromeBluetoothLowEnergyPeripheral peripheral = getPeripheralByDeviceAddress(deviceAddress);

    if (peripheral == null) {
      callbackContext.error("Invalid Argument");
      return;
    }

    cordova.getThreadPool().execute(new Runnable() {
        public void run() {
          peripheral.writeDescriptorValue(descriptorId, value, callbackContext);
        }
      });
  }

  private void registerBluetoothLowEnergyEvents(final CallbackContext callbackContext)
      throws JSONException {

    bluetoothLowEnergyEventsCallback = callbackContext;

  }

  private static PluginResult getMultipartServiceEventsResult(
      String eventType, String deviceAddress, BluetoothGattService service) throws JSONException {

    List<PluginResult> multipartMessage = new ArrayList<PluginResult>();
    multipartMessage.add(new PluginResult(Status.OK, eventType));
    multipartMessage.add(new PluginResult(Status.OK, buildServiceInfo(deviceAddress, service)));
    PluginResult result = new PluginResult(Status.OK, multipartMessage);
    result.setKeepCallback(true);
    return result;
  }

  private void sendServiceAddedEvent(String deviceAddress, BluetoothGattService service) {
    try {
      bluetoothLowEnergyEventsCallback.sendPluginResult(
          getMultipartServiceEventsResult(
              "onServiceAdded", deviceAddress, service));
    } catch (JSONException e) {
    }
  }

  private void sendServiceChangedEvent(String deviceAddress, BluetoothGattService service) {
    try {
      bluetoothLowEnergyEventsCallback.sendPluginResult(
          getMultipartServiceEventsResult(
              "onServiceChanged", deviceAddress, service));
    } catch (JSONException e) {
    }
  }

  private void sendServiceRemovedEvent(String deviceAddress, BluetoothGattService service) {
    try {
      bluetoothLowEnergyEventsCallback.sendPluginResult(
          getMultipartServiceEventsResult(
              "onServiceRemoved", deviceAddress, service));
    } catch (JSONException e) {
    }
  }

  private void sendCharacteristicValueChangedEvent(
      String deviceAddress, BluetoothGattCharacteristic characteristic) {

    List<PluginResult> multipartMessage = new ArrayList<PluginResult>();
    multipartMessage.add(new PluginResult(Status.OK, "onCharacteristicValueChanged"));

    try {
      multipartMessage.addAll(buildCharacteristicMultipartInfo(deviceAddress, characteristic));
      PluginResult result = new PluginResult(Status.OK, multipartMessage);
      result.setKeepCallback(true);
      bluetoothLowEnergyEventsCallback.sendPluginResult(result);
    } catch (JSONException e) {
    }
  }

  // From chrome API documentation: "This event exists mostly for convenience
  // and will always be sent after a successful call to readDescriptorValue."
  private void sendDescriptorValueChangedEvent(
      String deviceAddress, BluetoothGattDescriptor descriptor) {

    List<PluginResult> multipartMessage = new ArrayList<PluginResult>();
    multipartMessage.add(new PluginResult(Status.OK, "onDescriptorValueChanged"));
    try {
      multipartMessage.addAll(buildDescriptorMultipartInfo(deviceAddress, descriptor));
      PluginResult result = new PluginResult(Status.OK, multipartMessage);
      result.setKeepCallback(true);
      bluetoothLowEnergyEventsCallback.sendPluginResult(result);
    } catch (JSONException e) {
    }
  }

  private class ChromeBluetoothLowEnergyPeripheral {

    // The UUID of remote notification config descriptor. We need to set the
    // value of this descriptor when startNotification() or stopNotification()
    // on characteristics.
    private final static String CLIENT_CHARACTERISTIC_CONFIG =
        "00002902-0000-1000-8000-00805f9b34fb";
    private final static int CONNECTION_TIMEOUT = 2000;

    private final ScanResult bleScanResult;

    private BluetoothGatt gatt;

    private Map<String, BluetoothGattService> knownServices =
        new HashMap<String, BluetoothGattService>();
    private Map<String, BluetoothGattCharacteristic> knownCharacteristics =
        new HashMap<String, BluetoothGattCharacteristic>();
    private Map<String, BluetoothGattDescriptor> knownDescriptors =
        new HashMap<String, BluetoothGattDescriptor>();

    private CallbackContext connectCallback;
    private CallbackContext disconnectCallback;

    private CallbackContext getServicesCallbackContext;

    private CallbackContext gattCommandCallbackContext;

    // BluetoothGatt only allows one async command at a time; otherwise, it will
    // cancel the previous command. Using this semaphore to ensure calling
    // BluetoothGatt async method in serial. This Semaphore is not initialized
    // until a connect() is called.
    private Semaphore gattAsyncCommandSemaphore;

    ChromeBluetoothLowEnergyPeripheral(ScanResult bleScanResult) {
      this.bleScanResult = bleScanResult;
    }

    private synchronized void successIfNotTimeout() {
      if (isConnected() && connectCallback != null) {
        connectCallback.success();
        connectCallback = null;
      }
    }

    private synchronized void timeoutIfNotConnect() {
      if (!isConnected() && connectCallback != null) {
        connectCallback.error("Connection timeout");
        connectCallback = null;
        close();
      }
    }

    private void close() {
      if (gatt != null) {
        gatt.close();
      }

      knownServices.clear();
      knownDescriptors.clear();
      knownCharacteristics.clear();
    }

    private boolean isConnected() {

      if (gatt == null)
        return false;

      ChromeBluetooth bluetoothPlugin =
          (ChromeBluetooth) getPluginManager().getPlugin("ChromeBluetooth");
      return bluetoothPlugin.isConnected(bleScanResult.getDevice());
    }

    void connect(CallbackContext callbackContext) throws InterruptedException {

      if (isConnected()) {
        callbackContext.error("Device is already connected");
        return;
      }

      connectCallback = callbackContext;

      gatt = bleScanResult.getDevice().connectGatt(
          webView.getContext(), false, gattEventsCallback);

      // Reset semaphore here because some read, write's callbacks may not be
      // called when a connection lost. This abort all pending gatt commands.
      gattAsyncCommandSemaphore = new Semaphore(1, true);

      Thread.sleep(CONNECTION_TIMEOUT);
      timeoutIfNotConnect();
    }

    void disconnect(CallbackContext callbackContext) {
      if (!isConnected()) {
        callbackContext.success();
        close();
      } else {
        disconnectCallback = callbackContext;
        gatt.disconnect();
      }
    }

    void getService(String serviceId, CallbackContext callbackContext) throws JSONException {

      if (!isConnected()) {
        callbackContext.error("Device is not connected");
        return;
      }

      BluetoothGattService service = knownServices.get(serviceId);

      if (service == null) {
        callbackContext.error("Invalid Argument");
        return;
      }

      callbackContext.sendPluginResult(new PluginResult(
          Status.OK, buildServiceInfo(bleScanResult.getDevice().getAddress(), service)));
    }

    void getServices(CallbackContext callbackContext) {

      if (!isConnected()) {
        callbackContext.error("Device is not connected");
        return;
      }

      getServicesCallbackContext = callbackContext;

      if (!gatt.discoverServices()) {
        getServicesCallbackContext.error("Failed to discover services");
        getServicesCallbackContext = null;
      }
    }

    void getCharacteristic(String characteristicId, CallbackContext callbackContext)
        throws JSONException {

      if (!isConnected()) {
        callbackContext.error("Device is not connected");
        return;
      }

      BluetoothGattCharacteristic characteristic = knownCharacteristics.get(characteristicId);

      if (characteristic == null) {
        callbackContext.error("Invalid Argument");
        return;
      }

      List<PluginResult> multipartMessage =
          buildCharacteristicMultipartInfo(bleScanResult.getDevice().getAddress(), characteristic);

      callbackContext.sendPluginResult(new PluginResult(Status.OK, multipartMessage));
    }

    void getCharacteristics(String serviceId, CallbackContext callbackContext) throws JSONException {

      if (!isConnected()) {
        callbackContext.error("Device is not connected");
        return;
      }

      BluetoothGattService service = knownServices.get(serviceId);

      if (service == null) {
        callbackContext.error("Invalid Argument");
        return;
      }

      Collection<BluetoothGattCharacteristic> characteristics = service.getCharacteristics();

      for (BluetoothGattCharacteristic characteristic : characteristics) {
        knownCharacteristics.put(
            buildCharacteristicId(bleScanResult.getDevice().getAddress(), characteristic),
            characteristic);
      }

      JSONArray characteristicsInfo = new JSONArray();
      for (BluetoothGattCharacteristic characteristic : characteristics) {
        characteristicsInfo.put(buildCharacteristicInfo(
            bleScanResult.getDevice().getAddress(), characteristic));
      }

      callbackContext.sendPluginResult(new PluginResult(Status.OK, characteristicsInfo));
    }

    void getIncludedServices(String serviceId, CallbackContext callbackContext)
        throws JSONException {

      if (!isConnected()) {
        callbackContext.error("Device is not connected");
        return;
      }

      BluetoothGattService service = knownServices.get(serviceId);

      if (service == null) {
        callbackContext.error("Invalid Argument");
        return;
      }

      Collection<BluetoothGattService> includedServices = service.getIncludedServices();
      JSONArray servicesInfo = new JSONArray();

      for (BluetoothGattService includedService : includedServices) {
        String includedServiceId = buildServiceId(
            bleScanResult.getDevice().getAddress(),
            includedService);
        if (!knownServices.containsKey(includedServiceId)) {
          sendServiceAddedEvent(bleScanResult.getDevice().getAddress(), includedService);
        }
        knownServices.put(includedServiceId, includedService);
        servicesInfo.put(buildServiceInfo(
            bleScanResult.getDevice().getAddress(), includedService));
      }

      callbackContext.sendPluginResult(new PluginResult(Status.OK, servicesInfo));
    }

    void getDescriptor(String descriptorId, CallbackContext callbackContext) throws JSONException {

      if (!isConnected()) {
        callbackContext.error("Device is not connected");
        return;
      }

      BluetoothGattDescriptor descriptor = knownDescriptors.get(descriptorId);

      if (descriptor == null) {
        callbackContext.error("Invalid Argument");
        return;
      }

      callbackContext.sendPluginResult(new PluginResult(
          Status.OK, buildDescriptorMultipartInfo(
              bleScanResult.getDevice().getAddress(), descriptor)));
    }

    void getDescriptors(String characteristicId, CallbackContext callbackContext)
        throws JSONException {

      if (!isConnected()) {
        callbackContext.error("Device is not connected");
        return;
      }

      BluetoothGattCharacteristic characteristic = knownCharacteristics.get(characteristicId);

      if (characteristic == null) {
        callbackContext.error("Invalid Argument");
        return;
      }

      Collection<BluetoothGattDescriptor> descriptors = characteristic.getDescriptors();
      JSONArray descriptorsInfo = new JSONArray();

      for (BluetoothGattDescriptor descriptor : descriptors) {
        knownDescriptors.put(
            buildDescriptorId(bleScanResult.getDevice().getAddress(), descriptor),
            descriptor);
        descriptorsInfo.put(buildDescriptorInfo(bleScanResult.getDevice().getAddress(), descriptor));
      }

      callbackContext.sendPluginResult(new PluginResult(Status.OK, descriptorsInfo));
    }

    void readCharacteristicValue(String characteristicId, CallbackContext callbackContext) {

      if (!isConnected()) {
        callbackContext.error("Device is not connected");
        return;
      }

      BluetoothGattCharacteristic characteristic = knownCharacteristics.get(characteristicId);

      if (characteristic == null) {
        callbackContext.error("Invalid Argument");
        return;
      }

      try {
        gattAsyncCommandSemaphore.acquire();
        gattCommandCallbackContext = callbackContext;
        if (!gatt.readCharacteristic(characteristic)) {
          gattCommandCallbackContext = null;
          gattAsyncCommandSemaphore.release();
          callbackContext.error("Failed to read characteristic value");
        }
      } catch (InterruptedException e) {
      }
    }

    void writeCharacteristicValue(
        String characteristicId, byte[] value, CallbackContext callbackContext) {

      if (!isConnected()) {
        callbackContext.error("Device is not connected");
        return;
      }

      BluetoothGattCharacteristic characteristic = knownCharacteristics.get(characteristicId);

      if (characteristic == null) {
        callbackContext.error("Invalid Argument");
        return;
      }

      try {
        gattAsyncCommandSemaphore.acquire();
        gattCommandCallbackContext = callbackContext;
        if (!(characteristic.setValue(value) && gatt.writeCharacteristic(characteristic))) {
          gattCommandCallbackContext = null;
          gattAsyncCommandSemaphore.release();
          callbackContext.error("Failed to write value into characteristic");
        }
      } catch (InterruptedException e) {
      }
    }

    void setCharacteristicNotification(
        String characteristicId, boolean enable, CallbackContext callbackContext) {

      if (!isConnected()) {
        callbackContext.error("Device is not connected");
        return;
      }

      BluetoothGattCharacteristic characteristic = knownCharacteristics.get(characteristicId);

      if (characteristic == null) {
        callbackContext.error("Invalid Argument");
        return;
      }

      // set characteristic local notification
      if (!gatt.setCharacteristicNotification(characteristic, enable)) {
        callbackContext.error("Failed to set characteristic local notification");
        return;
      }

      // set characteristic remote notification
      BluetoothGattDescriptor configDescriptor = characteristic.getDescriptor(
          UUID.fromString(CLIENT_CHARACTERISTIC_CONFIG));

      if (configDescriptor == null) {
        callbackContext.error("Invalid Operation");
        return;
      }

      if (enable) {
        configDescriptor.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
      } else {
        configDescriptor.setValue(BluetoothGattDescriptor.DISABLE_NOTIFICATION_VALUE);
      }

      try {
        gattAsyncCommandSemaphore.acquire();
        gattCommandCallbackContext = callbackContext;
        if (!gatt.writeDescriptor(configDescriptor)) {
          gattCommandCallbackContext = null;
          gattAsyncCommandSemaphore.release();
          callbackContext.error("Failed to set characteristic remote notification");
        }
      } catch (InterruptedException e) {
      }
    }

    void readDescriptorValue(String descriptorId, CallbackContext callbackContext) {

      if (!isConnected()) {
        callbackContext.error("Device is not connected");
        return;
      }

      BluetoothGattDescriptor descriptor = knownDescriptors.get(descriptorId);

      if (descriptor == null) {
        callbackContext.error("Invalid Argument");
        return;
      }

      try {
        gattAsyncCommandSemaphore.acquire();
        gattCommandCallbackContext = callbackContext;
        if (!gatt.readDescriptor(descriptor)) {
          gattCommandCallbackContext = null;
          gattAsyncCommandSemaphore.release();
          callbackContext.error("Failed to read descriptor value");
        }
      } catch (InterruptedException e) {
      }
    }

    void writeDescriptorValue(String descriptorId, byte[] value, CallbackContext callbackContext) {

      if (!isConnected()) {
        callbackContext.error("Device is not connected");
        return;
      }

      BluetoothGattDescriptor descriptor = knownDescriptors.get(descriptorId);

      if (descriptor == null) {
        callbackContext.error("Invalid Argument");
        return;
      }

      try {
        gattAsyncCommandSemaphore.acquire();
        gattCommandCallbackContext = callbackContext;
        if (!(descriptor.setValue(value) && gatt.writeDescriptor(descriptor))) {
          gattCommandCallbackContext = null;
          gattAsyncCommandSemaphore.release();
          callbackContext.error("Failed to write value into descriptor");
        }
      } catch (InterruptedException e) {
      }
    }

    private BluetoothGattCallback gattEventsCallback = new BluetoothGattCallback() {
        @Override
        public void onCharacteristicChanged(
            BluetoothGatt gatt, BluetoothGattCharacteristic characteristic) {
          sendCharacteristicValueChangedEvent(
              bleScanResult.getDevice().getAddress(), characteristic);
        }

        @Override
        public void onCharacteristicRead(
            BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, int status) {

          CallbackContext readCallbackContext = gattCommandCallbackContext;
          gattCommandCallbackContext = null;
          gattAsyncCommandSemaphore.release();

          String characteristicId = buildCharacteristicId(
              bleScanResult.getDevice().getAddress(), characteristic);

          if (readCallbackContext == null)
            return;

          switch (status) {
            case BluetoothGatt.GATT_SUCCESS:
              try {
                readCallbackContext.sendPluginResult(
                    new PluginResult(Status.OK, buildCharacteristicMultipartInfo(
                        bleScanResult.getDevice().getAddress(),
                        characteristic)));
              } catch (JSONException e) {
                readCallbackContext.error(e.getMessage());
              }
              break;
            case BluetoothGatt.GATT_READ_NOT_PERMITTED:
              readCallbackContext.error("Read characteristic not permitted");
              break;
            default:
              readCallbackContext.error("Read characteristic failed");
          }
        }

        @Override
        public void onCharacteristicWrite(
            BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, int status) {

          CallbackContext writeCallbackContext = gattCommandCallbackContext;
          gattCommandCallbackContext = null;
          gattAsyncCommandSemaphore.release();

          String characteristicId = buildCharacteristicId(
              bleScanResult.getDevice().getAddress(), characteristic);

          if (writeCallbackContext == null)
            return;

          switch (status) {
            case BluetoothGatt.GATT_SUCCESS:
              try {
                writeCallbackContext.sendPluginResult(
                    new PluginResult(Status.OK, buildCharacteristicMultipartInfo(
                        bleScanResult.getDevice().getAddress(),
                        characteristic)));
              } catch (JSONException e) {
                writeCallbackContext.error(e.getMessage());
              }
              break;
            case BluetoothGatt.GATT_WRITE_NOT_PERMITTED:
              writeCallbackContext.error("Write characteristic not permitted");
              break;
            default:
              writeCallbackContext.error("Write characteristic failed");
          }
        }

        @Override
        public void onConnectionStateChange(BluetoothGatt gatt, int status, int newState) {

          Log.d(LOG_TAG, "connection state changes - state: " + newState);

          switch (newState) {
            case BluetoothProfile.STATE_CONNECTED:
              successIfNotTimeout();
              break;
            case BluetoothProfile.STATE_DISCONNECTED:
              if (disconnectCallback != null) {
                disconnectCallback.success();
                disconnectCallback = null;
              }

              for (BluetoothGattService service : knownServices.values()) {
                sendServiceRemovedEvent(bleScanResult.getDevice().getAddress(), service);
              }

              close();
              break;
          }

          ChromeBluetooth bluetoothPlugin =
              (ChromeBluetooth) getPluginManager().getPlugin("ChromeBluetooth");
          bluetoothPlugin.sendDeviceChangedEvent(bleScanResult);
        }

        @Override
        public void onDescriptorRead(
            BluetoothGatt gatt, BluetoothGattDescriptor descriptor, int status) {

          CallbackContext readCallbackContext = gattCommandCallbackContext;
          gattCommandCallbackContext = null;
          gattAsyncCommandSemaphore.release();

          String descriptorId = buildDescriptorId(
              bleScanResult.getDevice().getAddress(), descriptor);

          if (readCallbackContext == null)
            return;

          switch (status) {
            case BluetoothGatt.GATT_SUCCESS:
              try {
                readCallbackContext.sendPluginResult(
                    new PluginResult(Status.OK, buildDescriptorMultipartInfo(
                        bleScanResult.getDevice().getAddress(),
                        descriptor)));
              } catch (JSONException e) {
                readCallbackContext.error(e.getMessage());
              }
              sendDescriptorValueChangedEvent(bleScanResult.getDevice().getAddress(), descriptor);
              break;
            case BluetoothGatt.GATT_READ_NOT_PERMITTED:
              readCallbackContext.error("Read descriptor not permitted");
              break;
            default:
              readCallbackContext.error("Read descriptor failed");
          }
        }

        @Override
        public void onDescriptorWrite(
            BluetoothGatt gatt, BluetoothGattDescriptor descriptor, int status) {
          CallbackContext callbackContext = gattCommandCallbackContext;
          gattCommandCallbackContext = null;
          gattAsyncCommandSemaphore.release();

          PluginResult result = null;

          if (descriptor.getUuid().toString().equals(CLIENT_CHARACTERISTIC_CONFIG)) {
            // Set remote notification by writing into config descriptor
            result = new PluginResult(Status.OK);

          } else {
            // Normal descriptor write
            try {
              result = new PluginResult(Status.OK, buildDescriptorMultipartInfo(
                  bleScanResult.getDevice().getAddress(),
                  descriptor));
            } catch (JSONException e) {
              callbackContext.error(e.getMessage());
              return;
            }
          }

          if (callbackContext == null)
            return;

          switch (status) {
            case BluetoothGatt.GATT_SUCCESS:
              callbackContext.sendPluginResult(result);
              break;
            case BluetoothGatt.GATT_WRITE_NOT_PERMITTED:
              callbackContext.error("Write descriptor not permitted");
              break;
            default:
              callbackContext.error("Write descriptor failed");
          }
        }

        // Not Implemented: onReadRemoteRssi
        // Not Implemented: onReliableWriteComplete

        @Override
        public void onServicesDiscovered(BluetoothGatt gatt, int status) {

          if (status == BluetoothGatt.GATT_SUCCESS) {

            Collection<BluetoothGattService> discoveredServices = gatt.getServices();
            JSONArray servicesInfo = new JSONArray();

            for (BluetoothGattService discoveredService : discoveredServices) {
              String serviceId = buildServiceId(
                  bleScanResult.getDevice().getAddress(),
                  discoveredService);

              if (knownServices.containsKey(serviceId)) {
                sendServiceChangedEvent(bleScanResult.getDevice().getAddress(), discoveredService);
              } else {
                sendServiceAddedEvent(bleScanResult.getDevice().getAddress(), discoveredService);
              }

              knownServices.put(serviceId, discoveredService);

              try {
                servicesInfo.put(buildServiceInfo(
                    bleScanResult.getDevice().getAddress(),
                    discoveredService));
              } catch (JSONException e) {
              }
            }

            if (getServicesCallbackContext != null) {
              getServicesCallbackContext.sendPluginResult(new PluginResult(Status.OK, servicesInfo));
              getServicesCallbackContext = null;
            }
          }
        }
      };
  }
}
