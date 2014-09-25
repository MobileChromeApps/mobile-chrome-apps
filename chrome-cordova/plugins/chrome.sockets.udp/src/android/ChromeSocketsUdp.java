package org.chromium;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.MulticastSocket;
import java.net.SocketAddress;
import java.net.SocketException;
import java.net.UnknownHostException;
import java.nio.ByteBuffer;
import java.nio.channels.DatagramChannel;
import java.nio.channels.SelectionKey;
import java.nio.channels.Selector;
import java.util.Collection;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.LinkedBlockingQueue;

import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.apache.cordova.PluginResult.Status;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.util.Log;

public class ChromeSocketsUdp extends CordovaPlugin {

  private static final String LOG_TAG = "ChromeSocketsUdp";

  private Map<Integer, UdpSocket> sockets = new ConcurrentHashMap<Integer, UdpSocket>();
  private BlockingQueue<SelectorMessage> selectorMessages =
      new LinkedBlockingQueue<SelectorMessage>();
  private int nextSocket = 0;
  private CallbackContext recvContext;
  private Selector selector;
  private SelectorThread selectorThread;

  @Override
  public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    if ("create".equals(action)) {
      create(args, callbackContext);
    } else if ("update".equals(action)) {
      update(args, callbackContext);
    } else if ("setPaused".equals(action)) {
      setPaused(args, callbackContext);
    } else if ("bind".equals(action)) {
      bind(args, callbackContext);
    } else if ("send".equals(action)) {
      send(args, callbackContext);
    } else if ("close".equals(action)) {
      close(args, callbackContext);
    } else if ("getInfo".equals(action)) {
      getInfo(args, callbackContext);
    } else if ("getSockets".equals(action)) {
      getSockets(args, callbackContext);
    } else if ("joinGroup".equals(action)) {
      joinGroup(args, callbackContext);
    } else if ("leaveGroup".equals(action)) {
      leaveGroup(args, callbackContext);
    } else if ("setMulticastTimeToLive".equals(action)) {
      setMulticastTimeToLive(args, callbackContext);
    } else if ("setMulticastLoopbackMode".equals(action)) {
      setMulticastLoopbackMode(args, callbackContext);
    } else if ("getJoinedGroups".equals(action)) {
      getJoinedGroups(args, callbackContext);
    } else if ("registerReceiveEvents".equals(action)) {
      registerReceiveEvents(args, callbackContext);
    } else {
      return false;
    }

    return true;
  }

  public void onDestory() {
    closeAllSockets();
    stopSelectorThread();
  }

  public void onReset() {
    closeAllSockets();
    stopSelectorThread();
  }

  private void create(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    JSONObject properties = args.getJSONObject(0);

    try {
      UdpSocket socket = new UdpSocket(nextSocket++, recvContext, properties);
      selectorMessages.put(
          new SelectorMessage(socket, SelectorMessageType.SO_CREATE, callbackContext));
      selector.wakeup();

    } catch (IOException e) {
    } catch (InterruptedException e) {
    }
  }

  private void update(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    int socketId = args.getInt(0);
    JSONObject properties = args.getJSONObject(1);

    UdpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      return;
    }

    try {
      socket.setProperties(properties);
    } catch (SocketException e) {
    }

    callbackContext.success();
  }

  private void setPaused(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    int socketId = args.getInt(0);
    boolean paused = args.getBoolean(1);

    UdpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      return;
    }

    socket.setPaused(paused);

    callbackContext.success();
  }

  private void bind(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    int socketId = args.getInt(0);
    String address = args.getString(1);
    int port = args.getInt(2);

    UdpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      callbackContext.error(-1000);
      return;
    }

    try {
      socket.bind(address, port);
      callbackContext.success();
    } catch (SocketException e) {
      callbackContext.error(-1000);
    }
  }

  private void send(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    int socketId = args.getInt(0);
    String address = args.getString(1);
    int port = args.getInt(2);
    byte[] data = args.getArrayBuffer(3);

    UdpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      callbackContext.error(-1000);
      return;
    }

    try {
      int bytesSent = socket.send(address, port, data);
      if (bytesSent > 0) {
        callbackContext.success(bytesSent);
      } else {
        socket.addSendPacket(address, port, data, callbackContext);
      }
    } catch (IOException e) {
      callbackContext.error(-1000);
    }
  }

  private void sendCloseMessage(UdpSocket socket, CallbackContext callbackContext)
      throws InterruptedException {
    selectorMessages.put(
        new SelectorMessage(socket, SelectorMessageType.SO_CLOSE, callbackContext));
  }

  private void closeAllSockets() {
    try {
      for (UdpSocket socket: sockets.values()) {
        sendCloseMessage(socket, null);
      }
      selector.wakeup();
    } catch (InterruptedException e) {
    }
  }

  private void close(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    int socketId = args.getInt(0);

    UdpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      return;
    }

    try {
      sendCloseMessage(socket, callbackContext);
      selector.wakeup();
    } catch (InterruptedException e) {
    }
  }

  private void getInfo(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    int socketId = args.getInt(0);

    UdpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      return;
    }
    callbackContext.success(socket.getInfo());
  }

  private void getSockets(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    JSONArray results = new JSONArray();

    for (UdpSocket socket: sockets.values()) {
      results.put(socket.getInfo());
    }

    callbackContext.success(results);
  }

  private void joinGroup(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    int socketId = args.getInt(0);
    String address = args.getString(1);

    UdpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      callbackContext.error(-1000);
      return;
    }

    try {
      socket.joinGroup(address);
      callbackContext.success();
    } catch (UnknownHostException e) {
      callbackContext.error(-1000);
    } catch (IOException e) {
      callbackContext.error(-1000);
    }
  }

  private void leaveGroup(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    int socketId = args.getInt(0);
    String address = args.getString(1);

    UdpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      callbackContext.error(-1000);
      return;
    }

    try {
      socket.leaveGroup(address);
      callbackContext.success();
    } catch (UnknownHostException e) {
      callbackContext.error(-1000);
    } catch (IOException e) {
      callbackContext.error(-1000);
    }
  }

  private void setMulticastTimeToLive(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    int socketId = args.getInt(0);
    int ttl = args.getInt(1);

    UdpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      callbackContext.error(-1000);
      return;
    }

    try {
      socket.setMulticastTimeToLive(ttl);
      callbackContext.success();
    } catch (IOException e) {
      callbackContext.error(-1000);
    }
  }

  private void setMulticastLoopbackMode(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    int socketId = args.getInt(0);
    boolean enabled = args.getBoolean(1);

    UdpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      callbackContext.error(-1000);
      return;
    }

    try {
      socket.setMulticastLoopbackMode(enabled);
      callbackContext.success();
    } catch (SocketException e) {
      callbackContext.error(-1000);
    }
  }

  private void getJoinedGroups(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    int socketId = args.getInt(0);

    UdpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      return;
    }
    callbackContext.success(new JSONArray(socket.getJoinedGroups()));
  }

  private void registerReceiveEvents(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    recvContext = callbackContext;
    startSelectorThread();
  }

  private void startSelectorThread() {
    if (selector != null && selectorThread != null) return;
    try {
      selector = Selector.open();
      selectorThread = new SelectorThread(selector, selectorMessages, sockets);
      selectorThread.start();
    } catch (IOException e) {
      selector = null;
      selectorThread = null;
      PluginResult err = new PluginResult(Status.ERROR, -1000);
      err.setKeepCallback(true);
      recvContext.sendPluginResult(err);
    }
  }

  private void stopSelectorThread() {
    if (selector == null && selectorThread == null) return;

    try {
      selectorMessages.put(new SelectorMessage(null, SelectorMessageType.T_STOP, null));
      selector.wakeup();
      selectorThread.join();
      selector = null;
      selectorThread = null;
    } catch (InterruptedException e) {
    }
  }

  private enum SelectorMessageType {
    SO_CREATE,
    SO_CLOSE,
    T_STOP;
  }

  private class SelectorMessage {

    final UdpSocket socket;
    final SelectorMessageType type;
    final CallbackContext callbackContext;

    SelectorMessage(
        UdpSocket socket, SelectorMessageType type, CallbackContext callbackContext) {
      this.socket = socket;
      this.type = type;
      this.callbackContext = callbackContext;
    }
  }

  private class SelectorThread extends Thread {

    private final Selector selector;
    private BlockingQueue<SelectorMessage> selectorMessages;
    private Map<Integer, UdpSocket> sockets;
    private boolean running = true;

    SelectorThread(
        Selector selector, BlockingQueue<SelectorMessage> selectorMessages,
        Map<Integer, UdpSocket> sockets) {

      this.selector = selector;
      this.selectorMessages = selectorMessages;
      this.sockets = sockets;
    }

    private void processPendingMessages() {

      while (selectorMessages.peek() != null) {

        SelectorMessage msg = null;
        try {
          msg = selectorMessages.take();
          switch (msg.type) {
            case SO_CREATE:
              msg.socket.register(selector, SelectionKey.OP_READ);
              sockets.put(Integer.valueOf(msg.socket.getSocketId()), msg.socket);
              msg.callbackContext.success(msg.socket.getSocketId());
              break;
            case SO_CLOSE:
              msg.socket.close();
              sockets.remove(Integer.valueOf(msg.socket.getSocketId()));
              if (msg.callbackContext != null)
                msg.callbackContext.success();
              break;
            case T_STOP:
              running = false;
              break;
          }

        } catch (InterruptedException e) {
        } catch (IOException e) {
          if (msg.callbackContext != null) {
            msg.callbackContext.error(-1000);
          }
        }
      }

    }

    public void run() {
      Iterator<SelectionKey> it;
      while (running) {

        try {
          selector.select();
        } catch (IOException e) {
          continue;
        }

        it = selector.selectedKeys().iterator();

        while (it.hasNext()) {

          SelectionKey key = it.next();
          it.remove();

          if (!key.isValid()) {
            continue;
          }

          UdpSocket socket = (UdpSocket)key.attachment();

          if (key.isReadable()) {
            socket.read();
          }

          if (key.isWritable()) {
            socket.dequeueSend();
          }
        } // while next

        processPendingMessages();

      }
    }
  }

  private class UdpSocket {
    private final int socketId;
    private final DatagramChannel channel;
    private final MulticastSocket multicastSocket;
    private final CallbackContext recvContext;

    private BlockingQueue<UdpSendPacket> sendPackets = new LinkedBlockingQueue<UdpSendPacket>();
    private HashSet<String> multicastGroups = new HashSet<String>();
    private SelectionKey key;

    private boolean paused;

    private boolean persistent;
    private String name;
    private int bufferSize;

    private MulticastReadThread multicastReadThread;

    UdpSocket(int socketId, CallbackContext recvContext, JSONObject properties)
        throws JSONException, IOException {

      this.socketId = socketId;
      this.recvContext = recvContext;

      channel = DatagramChannel.open();
      channel.configureBlocking(false);
      multicastSocket = new MulticastSocket(null);

      // set socket default options
      paused = false;
      persistent = false;
      bufferSize = 4096;
      name = "";

      multicastReadThread = null;

      setProperties(properties);
      setBufferSize();
    }

    void addInterestSet(int interestSet) {
      if (key != null) {
        key.interestOps(key.interestOps() | interestSet);
        key.selector().wakeup();
      }
    }

    void removeInterestSet(int interestSet) {
      if (key != null) {
        key.interestOps(key.interestOps() & ~interestSet);
        key.selector().wakeup();
      }
    }

    int getSocketId() {
      return socketId;
    }

    void register(Selector selector, int interestSets) throws IOException {
      key = channel.register(selector, interestSets, this);
    }

    void setProperties(JSONObject properties) throws JSONException, SocketException {

      if (!properties.isNull("persistent"))
        persistent = properties.getBoolean("persistent");

      if (!properties.isNull("name"))
        name = properties.getString("name");

      if (!properties.isNull("bufferSize")) {
        bufferSize = properties.getInt("bufferSize");
        setBufferSize();
      }
    }

    void setBufferSize() throws SocketException {
      channel.socket().setSendBufferSize(bufferSize);
      channel.socket().setReceiveBufferSize(bufferSize);
    }

    void setPaused(boolean paused) {
      this.paused = paused;
      if (paused) {
        removeInterestSet(SelectionKey.OP_READ);
      } else {
        addInterestSet(SelectionKey.OP_READ);
      }
    }

    void addSendPacket(String address, int port, byte[] data, CallbackContext callbackContext) {
      UdpSendPacket sendPacket = new UdpSendPacket(address, port, data, callbackContext);
      addInterestSet(SelectionKey.OP_WRITE);
      try {
        sendPackets.put(sendPacket);
      } catch (InterruptedException e) {
      }
    }

    void bind(String address, int port) throws SocketException {
      channel.socket().setReuseAddress(true);
      channel.socket().bind(new InetSocketAddress(port));
      multicastSocket.setReuseAddress(true);
      multicastSocket.bind(new InetSocketAddress(port));
    }

    int send(String address, int port, byte[] data) throws IOException {
      return channel.send(ByteBuffer.wrap(data), new InetSocketAddress(address, port));
    }

    void dequeueSend() {
      if (sendPackets.peek() != null) {
        UdpSendPacket sendPacket = null;
        try {
          sendPacket = sendPackets.take();
          int bytesSent = channel.send(sendPacket.data, sendPacket.address);
          sendPacket.callbackContext.success(bytesSent);
        } catch (InterruptedException e) {
        } catch (IOException e) {
          sendPacket.callbackContext.error(-1000);
        }
      } else {
        removeInterestSet(SelectionKey.OP_WRITE);
      }
    }

    void close() throws IOException {

      if (key != null && channel.isRegistered())
        key.cancel();

      channel.close();
      multicastSocket.close();

      if (multicastReadThread != null) {
        multicastReadThread.cancel();
      }
    }

    JSONObject getInfo() throws JSONException {

      JSONObject info = new JSONObject();

      info.put("socketId", socketId);
      info.put("persistent", persistent);
      info.put("bufferSize", bufferSize);
      info.put("name", name);
      info.put("paused", paused);

      if (channel.socket().getLocalAddress() != null) {
        info.put("localAddress", channel.socket().getLocalAddress().getHostAddress());
        info.put("localPort", channel.socket().getLocalPort());
      }

      return info;
    }

    void joinGroup(String address) throws UnknownHostException, IOException {

      if (multicastGroups.contains(address)) {
        Log.e(LOG_TAG, "Attempted to join an already joined multicast group.");
        return;
      }

      multicastGroups.add(address);
      multicastSocket.joinGroup(InetAddress.getByName(address));

      if (multicastReadThread == null) {
        multicastReadThread = new MulticastReadThread(socketId, multicastSocket, recvContext);
        multicastReadThread.start();
      }
    }

    void leaveGroup(String address) throws UnknownHostException, IOException {
      if (multicastGroups.contains(address)) {
        multicastGroups.remove(address);
        multicastSocket.leaveGroup(InetAddress.getByName(address));
      }
    }

    void setMulticastTimeToLive(int ttl) throws IOException {
      multicastSocket.setTimeToLive(ttl);
    }

    void setMulticastLoopbackMode(boolean enabled) throws SocketException {
      multicastSocket.setLoopbackMode(!enabled);
    }

    public Collection<String> getJoinedGroups() {
      return multicastGroups;
    }

    void read() {

      if (paused) return;

      ByteBuffer recvBuffer = ByteBuffer.allocate(bufferSize);
      recvBuffer.clear();

      try {
        SocketAddress address = channel.receive(recvBuffer);
        recvBuffer.flip();
        byte[] recvBytes = new byte[recvBuffer.limit()];
        recvBuffer.get(recvBytes);

        PluginResult dataResult = new PluginResult(Status.OK, recvBytes);
        dataResult.setKeepCallback(true);

        recvContext.sendPluginResult(dataResult);

        JSONObject metadata = new JSONObject();

        metadata.put("socketId", socketId);
        if (address instanceof InetSocketAddress) {
          InetSocketAddress remoteInfo = (InetSocketAddress) address;
          metadata.put("remoteAddress", remoteInfo.getAddress().getHostAddress());
          metadata.put("remotePort", remoteInfo.getPort());
        }

        PluginResult metadataResult = new PluginResult(Status.OK, metadata);
        metadataResult.setKeepCallback(true);

        recvContext.sendPluginResult(metadataResult);

      } catch (IOException e) {
      } catch (JSONException e) {
      }
    }

    private class MulticastReadThread extends Thread {
      private final int socketId;
      private final MulticastSocket socket;
      private final CallbackContext recvContext;

      MulticastReadThread(int socketId, MulticastSocket socket, CallbackContext recvContext) {
        this.socketId = socketId;
        this.socket = socket;
        this.recvContext = recvContext;
      }

      public void run() {
        while(!Thread.currentThread().isInterrupted()) {
          try {
            byte[] out = new byte[socket.getReceiveBufferSize()];
            DatagramPacket packet = new DatagramPacket(out, out.length);
            socket.receive(packet);

            PluginResult dataResult = new PluginResult(Status.OK, out);
            dataResult.setKeepCallback(true);

            recvContext.sendPluginResult(dataResult);

            JSONObject metadata = new JSONObject();

            metadata.put("socketId", socketId);
            metadata.put("remoteAddress", packet.getAddress().getHostAddress());
            metadata.put("remotePort", packet.getPort());

            PluginResult metadataResult = new PluginResult(Status.OK, metadata);
            metadataResult.setKeepCallback(true);
            recvContext.sendPluginResult(metadataResult);
          } catch (IOException e) {
          } catch (JSONException e) {
          }
        }
      }

      public void cancel() {
        interrupt();
      }
    }

    private class UdpSendPacket {
      final SocketAddress address;
      final CallbackContext callbackContext;
      final ByteBuffer data;

      UdpSendPacket(String address, int port, byte[] data, CallbackContext callbackContext) {
        this.address = new InetSocketAddress(address, port);
        this.data = ByteBuffer.wrap(data);
        this.callbackContext = callbackContext;
      }
    }
  }
}
