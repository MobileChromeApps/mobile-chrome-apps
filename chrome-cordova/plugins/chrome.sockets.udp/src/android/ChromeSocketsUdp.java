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
import java.util.Set;
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

  @Override
  public void onDestroy() {
    super.onDestroy();
    closeAllSockets();
    stopSelectorThread();
  }

  @Override
  public void onReset() {
    super.onReset();
    closeAllSockets();
    stopSelectorThread();
  }

  private JSONObject buildErrorInfo(int code, String message) {
    JSONObject error = new JSONObject();
    try {
      error.put("message", message);
      error.put("resultCode", code);
    } catch (JSONException e) {
    }
    return error;
  }

  private void create(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    JSONObject properties = args.getJSONObject(0);

    try {
      UdpSocket socket = new UdpSocket(nextSocket++, properties);
      sockets.put(Integer.valueOf(socket.getSocketId()), socket);
      callbackContext.success(socket.getSocketId());
    } catch (IOException e) {
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
    if (paused) {
      // Read interest will be removed when socket is readable on selector thread.
      callbackContext.success();
    } else {
      addSelectorMessage(socket, SelectorMessageType.SO_ADD_READ_INTEREST, callbackContext);
    }
  }

  private void bind(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    int socketId = args.getInt(0);
    String address = args.getString(1);
    int port = args.getInt(2);

    UdpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      callbackContext.error(buildErrorInfo(-4, "Invalid Argument"));
      return;
    }

    try {
      socket.bind(address, port);
      addSelectorMessage(socket, SelectorMessageType.SO_BIND, callbackContext);
    } catch (SocketException e) {
      callbackContext.error(buildErrorInfo(-2, e.getMessage()));
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
      callbackContext.error(buildErrorInfo(-4, "Invalid Argument"));
      return;
    }

    socket.addSendPacket(address, port, data, callbackContext);
    addSelectorMessage(socket, SelectorMessageType.SO_ADD_WRITE_INTEREST, null);
  }

  private void closeAllSockets() {
    for (UdpSocket socket: sockets.values()) {
      addSelectorMessage(socket, SelectorMessageType.SO_CLOSE, null);
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

    addSelectorMessage(socket, SelectorMessageType.SO_CLOSE, callbackContext);
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
      callbackContext.error(buildErrorInfo(-4, "Invalid Argument"));
      return;
    }

    try {
      socket.joinGroup(address);
      callbackContext.success();
    } catch (UnknownHostException e) {
      callbackContext.error(buildErrorInfo(-2, e.getMessage()));
    } catch (IOException e) {
      callbackContext.error(buildErrorInfo(-2, e.getMessage()));
    }
  }

  private void leaveGroup(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    int socketId = args.getInt(0);
    String address = args.getString(1);

    UdpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      callbackContext.error(buildErrorInfo(-4, "Invalid Argument"));
      return;
    }

    try {
      socket.leaveGroup(address);
      callbackContext.success();
    } catch (UnknownHostException e) {
      callbackContext.error(buildErrorInfo(-2, e.getMessage()));
    } catch (IOException e) {
      callbackContext.error(buildErrorInfo(-2, e.getMessage()));
    }
  }

  private void setMulticastTimeToLive(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    int socketId = args.getInt(0);
    int ttl = args.getInt(1);

    UdpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      callbackContext.error(buildErrorInfo(-4, "Invalid Argument"));
      return;
    }

    try {
      socket.setMulticastTimeToLive(ttl);
      callbackContext.success();
    } catch (IOException e) {
      callbackContext.error(buildErrorInfo(-2, e.getMessage()));
    }
  }

  private void setMulticastLoopbackMode(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    int socketId = args.getInt(0);
    boolean enabled = args.getBoolean(1);

    UdpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      callbackContext.error(buildErrorInfo(-4, "Invalid Argument"));
      return;
    }

    try {
      socket.setMulticastLoopbackMode(enabled);
      callbackContext.success();
    } catch (IOException e) {
      callbackContext.error(buildErrorInfo(-2, e.getMessage()));
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

  private void registerReceiveEvents(CordovaArgs args, final CallbackContext callbackContext) {
    recvContext = callbackContext;
    startSelectorThread();
  }

  private void sendReceiveErrorEvent(int code, String message) {
    JSONObject error = new JSONObject();

    try {
      error.put("message", message);
      error.put("resultCode", code);
      PluginResult errorResult = new PluginResult(Status.ERROR, error);
      errorResult.setKeepCallback(true);
      recvContext.sendPluginResult(errorResult);
    } catch (JSONException e) {
    }
  }

  // This is a synchronized method because regular read and multicast read on
  // different threads, and we need to send data and metadata in serial in order
  // to decode the receive event correctly. Alternatively, we can send Multipart
  // messages.
  private synchronized void sendReceiveEvent(byte[] data, int socketId, String address, int port) {

    PluginResult dataResult = new PluginResult(Status.OK, data);
    dataResult.setKeepCallback(true);
    recvContext.sendPluginResult(dataResult);

    JSONObject metadata = new JSONObject();
    try {
      metadata.put("socketId", socketId);
      metadata.put("remoteAddress", address);
      metadata.put("remotePort", port);

      PluginResult metadataResult = new PluginResult(Status.OK, metadata);
      metadataResult.setKeepCallback(true);

      recvContext.sendPluginResult(metadataResult);
    } catch (JSONException e) {
    }
  }

  private void startSelectorThread() {
    if (selectorThread != null) return;
    selectorThread = new SelectorThread(selectorMessages, sockets);
    selectorThread.start();
  }

  private void stopSelectorThread() {
    if (selectorThread == null) return;

    addSelectorMessage(null, SelectorMessageType.T_STOP, null);
    try {
      selectorThread.join();
      selectorThread = null;
    } catch (InterruptedException e) {
    }
  }

  private void addSelectorMessage(
      UdpSocket socket, SelectorMessageType type, CallbackContext callbackContext) {
    try {
      selectorMessages.put(new SelectorMessage(
          socket, type, callbackContext));
      if (selector != null)
        selector.wakeup();
    } catch (InterruptedException e) {
    }
  }

  private enum SelectorMessageType {
    SO_BIND,
    SO_CLOSE,
    SO_ADD_READ_INTEREST,
    SO_ADD_WRITE_INTEREST,
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

    private BlockingQueue<SelectorMessage> selectorMessages;
    private Map<Integer, UdpSocket> sockets;
    private boolean running = true;

    SelectorThread(
        BlockingQueue<SelectorMessage> selectorMessages,
        Map<Integer, UdpSocket> sockets) {
      this.selectorMessages = selectorMessages;
      this.sockets = sockets;
    }

    private void processPendingMessages() {

      while (selectorMessages.peek() != null) {

        SelectorMessage msg = null;
        try {
          msg = selectorMessages.take();
          switch (msg.type) {
            case SO_BIND:
              msg.socket.register(selector, SelectionKey.OP_READ);
              break;
            case SO_CLOSE:
              msg.socket.close();
              sockets.remove(Integer.valueOf(msg.socket.getSocketId()));
              break;
            case SO_ADD_READ_INTEREST:
              msg.socket.addInterestSet(SelectionKey.OP_READ);
              break;
            case SO_ADD_WRITE_INTEREST:
              msg.socket.addInterestSet(SelectionKey.OP_WRITE);
              break;
            case T_STOP:
              running = false;
              break;
          }

          if (msg.callbackContext != null)
            msg.callbackContext.success();

        } catch (InterruptedException e) {
        } catch (IOException e) {
          if (msg.callbackContext != null) {
            msg.callbackContext.error(buildErrorInfo(-2, e.getMessage()));
          }
        }
      }

    }

    public void run() {

      try {
        selector = Selector.open();
      } catch (IOException e) {
        throw new RuntimeException(e);
      }

      // process possible messages that send during openning the selector
      // before select.
      processPendingMessages();

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

    private MulticastSocket multicastSocket;

    private BlockingQueue<UdpSendPacket> sendPackets = new LinkedBlockingQueue<UdpSendPacket>();
    private Set<String> multicastGroups = new HashSet<String>();
    private SelectionKey key;

    private boolean paused;
    private DatagramPacket pausedMulticastPacket;

    private boolean persistent;
    private String name;
    private int bufferSize;

    private MulticastReadThread multicastReadThread;

    UdpSocket(int socketId, JSONObject properties)
        throws JSONException, IOException {

      this.socketId = socketId;

      channel = DatagramChannel.open();
      channel.configureBlocking(false);
      multicastSocket = null;

      // set socket default options
      paused = false;
      persistent = false;
      bufferSize = 4096;
      name = "";

      multicastReadThread = null;

      setProperties(properties);
      setBufferSize();
    }

    // Only call this method on selector thread
    void addInterestSet(int interestSet) {
      if (key != null && key.isValid()) {
        key.interestOps(key.interestOps() | interestSet);
        key.selector().wakeup();
      }
    }

    // Only call this method on selector thread
    void removeInterestSet(int interestSet) {
      if (key != null && key.isValid()) {
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

    private void sendMulticastPacket(DatagramPacket packet) {
      byte[] out = packet.getData();

      // Truncate the buffer if the message was shorter than it.
      if (packet.getLength() != out.length) {
        byte[] temp = new byte[packet.getLength()];
        for(int i = 0; i < packet.getLength(); i++) {
          temp[i] = out[i];
        }
        out = temp;
      }

      sendReceiveEvent(out, socketId, packet.getAddress().getHostAddress(), packet.getPort());
    }

    private void bindMulticastSocket() throws SocketException {
      multicastSocket.bind(new InetSocketAddress(channel.socket().getLocalPort()));
      if (!paused) {
        multicastReadThread = new MulticastReadThread(multicastSocket);
        multicastReadThread.start();
      }
    }

    // Upgrade the normal datagram socket to multicast socket. All incoming
    // packet will be received on the multicast read thread. There is no way to
    // downgrade the same socket back to a normal datagram socket.
    private void upgradeToMulticastSocket() throws IOException {
      multicastSocket = new MulticastSocket(null);
      multicastSocket.setReuseAddress(true);
      if (channel.socket().isBound()) {
        bindMulticastSocket();
      }
    }

    private void resumeMulticastSocket() {
      if (pausedMulticastPacket != null) {
        sendMulticastPacket(pausedMulticastPacket);
        pausedMulticastPacket = null;
      }

      if (multicastSocket != null && multicastReadThread == null) {
        multicastReadThread = new MulticastReadThread(multicastSocket);
        multicastReadThread.start();
      }
    }

    void setPaused(boolean paused) {
      this.paused = paused;
      if (!this.paused) {
        resumeMulticastSocket();
      }
    }

    void addSendPacket(String address, int port, byte[] data, CallbackContext callbackContext) {
      UdpSendPacket sendPacket = new UdpSendPacket(address, port, data, callbackContext);
      try {
        sendPackets.put(sendPacket);
      } catch (InterruptedException e) {
      }
    }

    void bind(String address, int port) throws SocketException {
      channel.socket().setReuseAddress(true);
      channel.socket().bind(new InetSocketAddress(port));

      if (multicastSocket != null) {
        bindMulticastSocket();
      }
    }

    // This method can be only called by selector thread.
    void dequeueSend() {
      if (sendPackets.peek() == null) {
        removeInterestSet(SelectionKey.OP_WRITE);
        return;
      }

      UdpSendPacket sendPacket = null;
      try {
        sendPacket = sendPackets.take();
        int bytesSent = channel.send(sendPacket.data, sendPacket.address);
        sendPacket.callbackContext.success(bytesSent);
      } catch (InterruptedException e) {
      } catch (IOException e) {
        sendPacket.callbackContext.error(buildErrorInfo(-2, e.getMessage()));
      }
    }

    void close() throws IOException {

      if (key != null && channel.isRegistered())
        key.cancel();

      channel.close();

      if (multicastSocket != null) {
        multicastSocket.close();
        multicastSocket = null;
      }

      if (multicastReadThread != null) {
        multicastReadThread.cancel();
        multicastReadThread = null;
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

    void joinGroup(String address) throws IOException {

      if (multicastSocket == null) {
        upgradeToMulticastSocket();
      }
      if (multicastGroups.contains(address)) {
        Log.e(LOG_TAG, "Attempted to join an already joined multicast group.");
        return;
      }

      multicastGroups.add(address);
      multicastSocket.joinGroup(InetAddress.getByName(address));
    }

    void leaveGroup(String address) throws UnknownHostException, IOException {
      if (multicastGroups.contains(address)) {
        multicastGroups.remove(address);
        multicastSocket.leaveGroup(InetAddress.getByName(address));
      }
    }

    void setMulticastTimeToLive(int ttl) throws IOException {
      if (multicastSocket == null) {
        upgradeToMulticastSocket();
      }

      multicastSocket.setTimeToLive(ttl);
    }

    void setMulticastLoopbackMode(boolean enabled) throws IOException {
      if (multicastSocket == null) {
        upgradeToMulticastSocket();
      }

      multicastSocket.setLoopbackMode(!enabled);
    }

    public Collection<String> getJoinedGroups() {
      return multicastGroups;
    }

    // This method can be only called by selector thread.
    void read() {

      if (paused) {
        // Remove read interests to avoid seletor wakeup when readable.
        removeInterestSet(SelectionKey.OP_READ);
        return;
      }

      ByteBuffer recvBuffer = ByteBuffer.allocate(bufferSize);
      recvBuffer.clear();

      try {
        InetSocketAddress address = (InetSocketAddress) channel.receive(recvBuffer);
        recvBuffer.flip();
        byte[] recvBytes = new byte[recvBuffer.limit()];
        recvBuffer.get(recvBytes);

        sendReceiveEvent(
            recvBytes, socketId, address.getAddress().getHostAddress(), address.getPort());

      } catch (IOException e) {
        sendReceiveErrorEvent(-2, e.getMessage());
      }
    }

    private class MulticastReadThread extends Thread {

      private final MulticastSocket socket;

      MulticastReadThread(MulticastSocket socket) {
        this.socket = socket;
      }

      public void run() {
        while(!Thread.currentThread().isInterrupted()) {

          if (paused) {
            // Terminate the thread if the socket is paused
            multicastReadThread = null;
            return;
          }

          try {
            byte[] out = new byte[socket.getReceiveBufferSize()];
            DatagramPacket packet = new DatagramPacket(out, out.length);
            socket.receive(packet);

            if (paused) {
              pausedMulticastPacket = packet;
            } else {
              sendMulticastPacket(packet);
            }

          } catch (IOException e) {
            sendReceiveErrorEvent(-2, e.getMessage());
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
