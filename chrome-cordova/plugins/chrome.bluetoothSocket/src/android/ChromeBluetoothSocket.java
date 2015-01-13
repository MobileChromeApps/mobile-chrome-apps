// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import java.lang.reflect.Field;
import java.lang.reflect.Method;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothServerSocket;
import android.bluetooth.BluetoothSocket;
import android.util.Log;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginManager;
import org.apache.cordova.PluginResult;
import org.apache.cordova.PluginResult.Status;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.LinkedBlockingQueue;

public class ChromeBluetoothSocket extends CordovaPlugin {

  private Map<Integer, ChromeBluetoothSocketSocket> sockets =
      new ConcurrentHashMap<Integer, ChromeBluetoothSocketSocket>();

  private int nextSocket = 1;
  private static final String LOG_TAG = "ChromeBluetoothSocket";

  private CallbackContext bluetoothSocketEventsCallback;

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
    if ("create".equals(action)) {
      create(args, callbackContext);
    } else if ("update".equals(action)) {
      update(args, callbackContext);
    } else if ("setPaused".equals(action)) {
      setPaused(args, callbackContext);
    } else if ("listenUsingRfcomm".equals(action)) {
      listenUsingRfcomm(args, callbackContext);
    } else if ("connect".equals(action)) {
      connect(args, callbackContext);
    } else if ("disconnect".equals(action)) {
      disconnect(args, callbackContext);
    } else if ("close".equals(action)) {
      close(args, callbackContext);
    } else if ("send".equals(action)) {
      send(args, callbackContext);
    } else if ("getInfo".equals(action)) {
      getInfo(args, callbackContext);
    } else if ("getSockets".equals(action)) {
      getSockets(callbackContext);
    } else if ("registerBluetoothSocketEvents".equals(action)) {
      registerBluetoothSocketEvents(callbackContext);
    } else {
      return false;
    }
    return true;
  }

  private void create(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    JSONObject properties = args.getJSONObject(0);

    ChromeBluetoothSocketSocket socket = new ChromeBluetoothSocketSocket(nextSocket++, properties);
    sockets.put(socket.getSocketId(), socket);

    JSONObject createInfo = new JSONObject();
    createInfo.put("socketId", socket.getSocketId());
    callbackContext.success(createInfo);
  }

  private void update(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    int socketId = args.getInt(0);
    JSONObject properties = args.getJSONObject(1);

    ChromeBluetoothSocketSocket socket = sockets.get(socketId);

    if (socket == null) {
      callbackContext.error("Invalid Argument");
      return;
    }

    socket.update(properties);
    callbackContext.success();
  }

  private void setPaused(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    int socketId = args.getInt(0);
    boolean paused = args.getBoolean(1);

    ChromeBluetoothSocketSocket socket = sockets.get(socketId);

    if (socket == null) {
      callbackContext.error("Invalid Argument");
      return;
    }

    socket.setPaused(paused);
    callbackContext.success();
  }

  private void listenUsingRfcomm(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    int socketId = args.getInt(0);
    String uuid = args.getString(1);
    JSONObject options = args.getJSONObject(2);

    ChromeBluetoothSocketSocket socket = sockets.get(socketId);

    if (socket == null) {
      callbackContext.error("Invalid Argument");
      return;
    }

    socket.listenUsingRfcomm(uuid, options, callbackContext);
  }

  private void connect(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    int socketId = args.getInt(0);
    String address = args.getString(1);
    String uuid = args.getString(2);

    ChromeBluetoothSocketSocket socket = sockets.get(socketId);

    if (socket == null) {
      callbackContext.error("Invalid Argument");
      return;
    }

    socket.connect(address, uuid, callbackContext);
  }

  private void disconnect(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    int socketId = args.getInt(0);

    ChromeBluetoothSocketSocket socket = sockets.get(socketId);

    if (socket == null) {
      callbackContext.error("Invalid Argument");
      return;
    }

    try {
      socket.disconnect();
      callbackContext.success();
    } catch (IOException e) {
      callbackContext.error(e.getMessage());
    }
  }

  private void close(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    int socketId = args.getInt(0);

    ChromeBluetoothSocketSocket socket = sockets.get(socketId);

    if (socket == null) {
      callbackContext.error("Invalid Argument");
      return;
    }

    try {
      socket.disconnect();
      sockets.remove(socket.getSocketId());
      callbackContext.success();
    } catch (IOException e) {
      callbackContext.error(e.getMessage());
    }
  }

  private void send(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    int socketId = args.getInt(0);
    byte[] data = args.getArrayBuffer(1);

    ChromeBluetoothSocketSocket socket = sockets.get(socketId);

    if (socket == null) {
      callbackContext.error("Invalid Argument");
      return;
    }
    socket.send(data, callbackContext);
  }

  private void getInfo(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    int socketId = args.getInt(0);

    ChromeBluetoothSocketSocket socket = sockets.get(socketId);

    if (socket == null) {
      callbackContext.error("Invalid Argument");
      return;
    }

    callbackContext.success(socket.getInfo());
  }

  private void getSockets(final CallbackContext callbackContext) throws JSONException {

    JSONArray results = new JSONArray();

    for (ChromeBluetoothSocketSocket socket: sockets.values()) {
      results.put(socket.getInfo());
    }

    callbackContext.success(results);
  }

  private void registerBluetoothSocketEvents(final CallbackContext callbackContext) {
    bluetoothSocketEventsCallback = callbackContext;
  }

  private void sendReceiveEvent(int socketId, byte[] data) {
    List<PluginResult> multipartMessage = new ArrayList<PluginResult>();
    multipartMessage.add(new PluginResult(Status.OK, "onReceive"));
    multipartMessage.add(new PluginResult(Status.OK, socketId));
    multipartMessage.add(new PluginResult(Status.OK, data));
    PluginResult result = new PluginResult(Status.OK, multipartMessage);
    result.setKeepCallback(true);
    bluetoothSocketEventsCallback.sendPluginResult(result);
  }

  private static PluginResult getMultipartEventsResult(
      String eventType, Status status, JSONObject info) {
    List<PluginResult> multipartMessage = new ArrayList<PluginResult>();
    multipartMessage.add(new PluginResult(Status.OK, eventType));
    multipartMessage.add(new PluginResult(Status.OK, info));
    PluginResult result = new PluginResult(status, multipartMessage);
    result.setKeepCallback(true);
    return result;
  }

  private void sendReceiveErrorEvent(int socketId, String errorMessage) {
    try {
      JSONObject errorInfo = new JSONObject();
      errorInfo.put("socketId", socketId);
      errorInfo.put("errorMessage", errorMessage);
      bluetoothSocketEventsCallback.sendPluginResult(
          getMultipartEventsResult("onReceive", Status.ERROR, errorInfo));
    } catch (JSONException e) {
    }
  }

  private void sendAcceptEvent(int socketId, int clientSocketId) {
    try {
      JSONObject info = new JSONObject();
      info.put("socketId", socketId);
      info.put("clientSocketId", clientSocketId);
      bluetoothSocketEventsCallback.sendPluginResult(
          getMultipartEventsResult("onAccept", Status.OK, info));
    } catch (JSONException e) {
    }
  }

  private void sendAcceptErrorEvent(int socketId, String errorMessage) {
    try {
      JSONObject errorInfo = new JSONObject();
      errorInfo.put("socketId", socketId);
      errorInfo.put("errorMessage", errorMessage);
      bluetoothSocketEventsCallback.sendPluginResult(
          getMultipartEventsResult("onAccept", Status.ERROR, errorInfo));
    } catch (JSONException e) {
    }
  }

  private enum SocketType {
    SO_TYPE_UNKNOWN,
    SO_TYPE_CLIENT,
    SO_TYPE_SERVER;
  }
  private class ChromeBluetoothSocketSocket {

    private final int socketId;

    private boolean persistent;
    private String name;
    private int bufferSize;
    private boolean paused;

    private SocketType type;
    private UUID uuid;
    private BluetoothSocket clientSocket;
    private BluetoothServerSocket serverSocket;

    // Fields for client socket only
    private ClientThread clientThread;
    private byte[] pausedBuffer;

    // Fields for server socket only
    private ServerThread serverThread;
    private BlockingQueue<Integer> acceptedSocketsQueue = new LinkedBlockingQueue<Integer>();
    // The default backlog value depends on OS, we just set 1 for now.
    int backlog = 1;

    ChromeBluetoothSocketSocket(int socketId, JSONObject properties) throws JSONException {
      this.socketId = socketId;
      type = SocketType.SO_TYPE_UNKNOWN;
      setDefaultProperties();
      setProperties(properties);
    }

    // This constructor can only be used to create socket with an accepted socket
    private ChromeBluetoothSocketSocket(int socketId, BluetoothSocket clientSocket) {
      this.socketId = socketId;
      type = SocketType.SO_TYPE_CLIENT;
      this.clientSocket = clientSocket;
      paused = true;
      setDefaultProperties();
    }

    private void setDefaultProperties() {
      persistent = false;
      name = "";
      bufferSize = 4096;
      paused = false;
    }

    private void setProperties(JSONObject properties) throws JSONException {

      if (!properties.isNull("persistent"))
        persistent = properties.getBoolean("persistent");

      if (!properties.isNull("name"))
        name = properties.getString("name");

      if (!properties.isNull("bufferSize"))
        bufferSize = properties.getInt("bufferSize");
    }

    private boolean isConnected() {
      if (type == SocketType.SO_TYPE_CLIENT && clientSocket != null)  {
        return clientSocket.isConnected();
      }
      return false;
    }

    private void resumeClientSocket() {

      if (type != SocketType.SO_TYPE_CLIENT) {
        Log.e(LOG_TAG, "calling resumeClientSocket on an non-client socket");
        return;
      }

      if (pausedBuffer != null) {
        sendReceiveEvent(socketId, pausedBuffer);
        pausedBuffer = null;
      }

      if (clientThread == null) {
        clientThread = new ClientThread(socketId, clientSocket);
        clientThread.start();
      }
    }

    private void resumeServerSocket() {

      if (type != SocketType.SO_TYPE_SERVER) {
        Log.e(LOG_TAG, "calling resumeServerSocket on an non-server socket");
        return;
      }

      while(acceptedSocketsQueue.peek() != null) {
        try {
          int acceptedSocketId = acceptedSocketsQueue.take();
          sendAcceptEvent(socketId, acceptedSocketId);
        } catch (InterruptedException e) {
          sendAcceptErrorEvent(socketId, e.getMessage());
        }
      }

      if (serverThread == null) {
        serverThread = new ServerThread(socketId, serverSocket);
        serverThread.start();
      }
    }

    private void resume() {
      if (type == SocketType.SO_TYPE_CLIENT) {
        resumeClientSocket();
      }

      if (type == SocketType.SO_TYPE_SERVER) {
        resumeServerSocket();
      }
    }

    int getSocketId() {
      return socketId;
    }

    void update(JSONObject properties) throws JSONException {
      setProperties(properties);
    }

    void setPaused(boolean paused) {
      this.paused = paused;
      if (this.paused == false) {
        resume();
      }
    }

    void listenUsingRfcomm(String uuidString, JSONObject options, CallbackContext callbackContext)
        throws JSONException {

      if (serverSocket != null || type == SocketType.SO_TYPE_CLIENT) {
        callbackContext.error("Operation failed");
        return;
      }

      uuid = UUID.fromString(uuidString);
      if (!options.isNull("backlog")) {
        backlog = options.getInt("backlog");
      }

      try {
        serverSocket = BluetoothAdapter.getDefaultAdapter()
            .listenUsingRfcommWithServiceRecord("ChromeBluetoothSocket", uuid);
        type = SocketType.SO_TYPE_SERVER;
      } catch (IOException e) {
        serverSocket = null;
        callbackContext.error(e.getMessage());
        return;
      }

      serverThread = new ServerThread(socketId, serverSocket);
      serverThread.start();
      callbackContext.success();
    }

    void connect(String address, String uuidString, final CallbackContext callbackContext) {

      if (isConnected() || type == SocketType.SO_TYPE_SERVER) {
        callbackContext.error("Operation failed");
        return;
      }

      uuid = UUID.fromString(uuidString);

      ChromeBluetooth bluetoothPlugin =
          (ChromeBluetooth) getPluginManager().getPlugin("ChromeBluetooth");
      BluetoothDevice device = bluetoothPlugin.getKnownBluetoothDevice(address);

      if (device == null) {
        callbackContext.error("Device not found");
        return;
      }

      try {
        clientSocket = device.createRfcommSocketToServiceRecord(uuid);
        type = SocketType.SO_TYPE_CLIENT;
      } catch (IOException e) {
        callbackContext.error(e.getMessage());
        clientSocket = null;
        type = SocketType.SO_TYPE_UNKNOWN;
        return;
      }

      clientThread = new ClientThread(socketId, clientSocket, callbackContext);
      clientThread.start();
    }

    void disconnect() throws IOException {

      uuid = null;
      type = SocketType.SO_TYPE_UNKNOWN;

      if (isConnected()) {
        if (clientThread != null) {
          clientThread.cancel();
        }
        clientSocket.close();
        clientSocket = null;
        clientThread = null;
        type = SocketType.SO_TYPE_UNKNOWN;
      }

      if (type == SocketType.SO_TYPE_SERVER) {
        if (serverThread != null) {
          serverThread.cancel();
        }
        serverSocket.close();
        serverSocket = null;
        serverThread = null;
        type = SocketType.SO_TYPE_UNKNOWN;
      }
    }

    void send(byte[] data, CallbackContext callbackContext) {

      if (!isConnected()) {
        callbackContext.error("Socket is not connected");
        return;
      }

      try {
        clientSocket.getOutputStream().write(data);
        callbackContext.success(data.length);
      } catch (IOException e) {
        callbackContext.error(e.getMessage());
      }
    }

    JSONObject getInfo() throws JSONException {

      JSONObject info = new JSONObject();

      info.put("socketId", socketId);
      info.put("persistent", persistent);
      info.put("bufferSize", bufferSize);
      info.put("paused", paused);
      info.put("name", name);
      info.put("connected", isConnected());

      if (isConnected()) {
        info.put("address", clientSocket.getRemoteDevice().getAddress());
      }

      if (type != SocketType.SO_TYPE_UNKNOWN) {
        info.put("uuid", uuid.toString());
      }

      return info;
    }

    private class ClientThread extends Thread {

      private final int socketId;
      private final BluetoothSocket socket;
      private final CallbackContext connectContext;

      ClientThread(int socketId, BluetoothSocket socket) {
        this.socketId = socketId;
        this.socket = socket;
        connectContext = null;
      }

      ClientThread(int socketId, BluetoothSocket socket, CallbackContext connectContext) {
        this.socketId = socketId;
        this.socket = socket;
        this.connectContext = connectContext;
      }

      public void run() {

        if (connectContext != null) {
          try {
            socket.connect();
            connectContext.success();
          } catch (IOException e) {
            connectContext.error(e.getMessage());
            clientSocket = null;
            clientThread = null;
            type = SocketType.SO_TYPE_UNKNOWN;
            return;
          }
        }

        while(!Thread.currentThread().isInterrupted()) {

          if (paused) {
            // Terminate the thread if the socket is paused
            clientThread = null;
            return;
          }

          byte[] readBuffer = new byte[bufferSize];
          int bytesRead = 0;

          try {
            bytesRead = socket.getInputStream().read(readBuffer);
          } catch (IOException e) {
            sendReceiveErrorEvent(socketId, e.getMessage());
          }

          if (bytesRead == -1) { // End of the stream
            return;
          }

          // Truncate the buffer if the message was shorter than it
          if (bytesRead != readBuffer.length) {
            byte[] temp = new byte[bytesRead];
            for (int i = 0; i < bytesRead; i++) {
              temp[i] = readBuffer[i];
            }
            readBuffer = temp;
          }

          if (paused) {
            pausedBuffer = readBuffer;
          } else {
            sendReceiveEvent(socketId, readBuffer);
          }
        }
      }

      public void cancel() {
        interrupt();
      }
    }

    private class ServerThread extends Thread {

      private final int socketId;
      private final BluetoothServerSocket socket;

      ServerThread(int socketId, BluetoothServerSocket socket) {
        this.socketId = socketId;
        this.socket = socket;
      }

      public void run() {
        while(!Thread.currentThread().isInterrupted()) {

          if (paused && acceptedSocketsQueue.size() == backlog) {
            // Terminate the thread if backlog reached and socket is still on paused.
            serverThread = null;
            return;
          }

          BluetoothSocket clientSocket;
          try {
            clientSocket = socket.accept();
          } catch (IOException e) {
            sendAcceptErrorEvent(socketId, e.getMessage());
            serverSocket = null;
            serverThread = null;
            type = SocketType.SO_TYPE_UNKNOWN;
            return;
          }

          ChromeBluetoothSocketSocket acceptedSocket =
              new ChromeBluetoothSocketSocket(nextSocket++, clientSocket);
          sockets.put(acceptedSocket.getSocketId(), acceptedSocket);

          if (paused) {
            try {
              acceptedSocketsQueue.put(acceptedSocket.getSocketId());
            } catch (InterruptedException e) {
              return;
            }
          } else {
            sendAcceptEvent(socketId, acceptedSocket.getSocketId());
          }
        }
      }

      public void cancel() {
        interrupt();
      }
    }
  }
}
