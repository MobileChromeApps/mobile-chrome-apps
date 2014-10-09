package org.chromium;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.SocketException;
import java.nio.ByteBuffer;
import java.nio.channels.SelectionKey;
import java.nio.channels.Selector;
import java.nio.channels.SocketChannel;
import java.security.NoSuchAlgorithmException;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.LinkedBlockingQueue;

import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLEngine;
import javax.net.ssl.SSLEngineResult;
import javax.net.ssl.SSLException;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.apache.cordova.PluginResult.Status;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.util.Log;

public class ChromeSocketsTcp extends CordovaPlugin {

  private static final String LOG_TAG = "ChromeSocketsTcp";

  private Map<Integer, TcpSocket> sockets = new ConcurrentHashMap<Integer, TcpSocket>();
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
    } else if ("setKeepAlive".equals(action)) {
      setKeepAlive(args, callbackContext);
    } else if ("setNoDelay".equals(action)) {
      setNoDelay(args, callbackContext);
    } else if ("connect".equals(action)) {
      connect(args, callbackContext);
    } else if ("disconnect".equals(action)) {
      disconnect(args, callbackContext);
    } else if ("secure".equals(action)) {
      secure(args, callbackContext);
    } else if ("send".equals(action)) {
      send(args, callbackContext);
    } else if ("close".equals(action)) {
      close(args, callbackContext);
    } else if ("getInfo".equals(action)) {
      getInfo(args, callbackContext);
    } else if ("getSockets".equals(action)) {
      getSockets(args, callbackContext);
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

  public int registerAcceptedSocketChannel(SocketChannel socketChannel)
      throws IOException, InterruptedException {
    TcpSocket socket = new TcpSocket(nextSocket++, recvContext, socketChannel);
    sockets.put(Integer.valueOf(socket.getSocketId()), socket);

    selectorMessages.put(new SelectorMessage(socket, SelectorMessageType.SO_ACCEPTED, null));
    selector.wakeup();

    return socket.getSocketId();
  }

  private void create(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    JSONObject properties = args.getJSONObject(0);

    try {
      TcpSocket socket = new TcpSocket(nextSocket++, recvContext, properties);
      sockets.put(Integer.valueOf(socket.getSocketId()), socket);
      callbackContext.success(socket.getSocketId());
    } catch (SocketException e) {
    } catch (IOException e) {
    }
  }

  private void update(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    int socketId = args.getInt(0);
    JSONObject properties = args.getJSONObject(1);

    TcpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      return;
    }

    try {
      socket.setProperties(properties);
      callbackContext.success();
    } catch (SocketException e) {
    }
  }

  private void setPaused(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    int socketId = args.getInt(0);
    boolean paused = args.getBoolean(1);

    TcpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      return;
    }

    socket.setPaused(paused);
    if (!paused) {
      try {
        selectorMessages.put(new SelectorMessage(
            socket, SelectorMessageType.SO_ADD_READ_INTEREST, null));
        selector.wakeup();
      } catch (InterruptedException e) {
      }
    }
    callbackContext.success();
  }

  private void setKeepAlive(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    int socketId = args.getInt(0);
    boolean enable = args.getBoolean(1);

    TcpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      callbackContext.error(-1000);
      return;
    }

    try {
      socket.setKeepAlive(enable);
      callbackContext.success();
    } catch (SocketException e) {
      callbackContext.error(-1000);
    }
  }

  private void setNoDelay(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    int socketId = args.getInt(0);
    boolean noDelay = args.getBoolean(1);

    TcpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      callbackContext.error(-1000);
      return;
    }

    try {
      socket.setNoDelay(noDelay);
      callbackContext.success();
    } catch (SocketException e) {
      callbackContext.error(-1000);
    }
  }

  private void connect(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    int socketId = args.getInt(0);
    String peerAddress = args.getString(1);
    int peerPort = args.getInt(2);

    TcpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      callbackContext.error(-1000);
      return;
    }

    try {
      if (socket.connect(peerAddress, peerPort, callbackContext)) {
        selectorMessages.put(new SelectorMessage(socket, SelectorMessageType.SO_CONNECTED, null));
      } else {
        selectorMessages.put(new SelectorMessage(socket, SelectorMessageType.SO_CONNECT, null));
      }
      selector.wakeup();
    } catch (IOException e) {
      callbackContext.error(-1000);
    } catch (InterruptedException e) {
    }
  }

  private void disconnect(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    int socketId = args.getInt(0);

    TcpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      return;
    }

    try {
      selectorMessages.put(
          new SelectorMessage(socket, SelectorMessageType.SO_DISCONNECTED, callbackContext));
      selector.wakeup();
    } catch (InterruptedException e) {
    }
  }

  private void secure(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    int socketId = args.getInt(0);
    JSONObject options = args.getJSONObject(1);

    TcpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      callbackContext.error(-1000);
      return;
    }

    if (!socket.isConnected()) {
      Log.e(LOG_TAG, "Socket is not connected with host " + socketId);
      callbackContext.error(-1000);
      return;
    }

    socket.secure(options, callbackContext);

    try {
      selectorMessages.put(
          new SelectorMessage(socket, SelectorMessageType.SSL_INIT_HANDSHAKE, null));
      selector.wakeup();
    } catch (InterruptedException e) {
    }
  }

  private void send(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    int socketId = args.getInt(0);
    byte[] data = args.getArrayBuffer(1);

    TcpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      callbackContext.error(-1000);
      return;
    }

    if (!socket.isConnected()) {
      Log.e(LOG_TAG, "Socket is not connected with host " + socketId);
      callbackContext.error(-1000);
      return;
    }

    socket.addSendPacket(data, callbackContext);

    try {
      selectorMessages.put(new SelectorMessage(
          socket, SelectorMessageType.SO_ADD_WRITE_INTEREST, null));
      selector.wakeup();
    } catch (InterruptedException e) {
    }
  }

  private void sendCloseMessage(TcpSocket socket, CallbackContext callbackContext)
      throws InterruptedException {
    selectorMessages.put(
        new SelectorMessage(socket, SelectorMessageType.SO_CLOSE, callbackContext));
  }

  private void closeAllSockets() {
    try {
      for (TcpSocket socket: sockets.values()) {
        sendCloseMessage(socket, null);
      }
      selector.wakeup();
    } catch (InterruptedException e) {
    }
  }

  private void close(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    int socketId = args.getInt(0);

    TcpSocket socket = sockets.get(Integer.valueOf(socketId));

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

    TcpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      return;
    }
    callbackContext.success(socket.getInfo());
  }

  private void getSockets(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    JSONArray results = new JSONArray();

    for (TcpSocket socket: sockets.values()) {
      results.put(socket.getInfo());
    }

    callbackContext.success(results);
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
    SO_CONNECT,
    SO_CONNECTED,
    SO_ACCEPTED,
    SO_DISCONNECTED,
    SO_CLOSE,
    SSL_INIT_HANDSHAKE,
    SO_ADD_READ_INTEREST,
    SO_ADD_WRITE_INTEREST,
    T_STOP;
  }

  private class SelectorMessage {
    final TcpSocket socket;
    final SelectorMessageType type;
    final CallbackContext callbackContext;

    SelectorMessage(
        TcpSocket socket, SelectorMessageType type, CallbackContext callbackContext) {
      this.socket = socket;
      this.type = type;
      this.callbackContext = callbackContext;
    }
  }

  private class SelectorThread extends Thread {
    private final Selector selector;
    private BlockingQueue<SelectorMessage> selectorMessages;
    private Map<Integer, TcpSocket> sockets;
    private boolean running = true;

    SelectorThread(
        Selector selector, BlockingQueue<SelectorMessage> selectorMessages,
        Map<Integer, TcpSocket> sockets) {
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
            case SO_CONNECT:
              msg.socket.register(selector, SelectionKey.OP_CONNECT);
              break;
            case SO_CONNECTED:
              msg.socket.register(selector, SelectionKey.OP_READ);
              break;
            case SO_ACCEPTED:
              msg.socket.register(selector, 0);
              break;
            case SO_DISCONNECTED:
              msg.socket.disconnect();
              if (msg.callbackContext != null)
                msg.callbackContext.success();
              break;
            case SO_CLOSE:
              msg.socket.disconnect();
              sockets.remove(Integer.valueOf(msg.socket.getSocketId()));
              if (msg.callbackContext != null)
                msg.callbackContext.success();
              break;
            case SSL_INIT_HANDSHAKE:
              msg.socket.setUpSSLEngine();
              while(msg.socket.handshaking());
              msg.socket.handshakeSuccess();
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
        } catch (InterruptedException e) {
        } catch (IOException e) {
          if (msg.callbackContext != null)
            msg.callbackContext.error(-1000);
        } catch (JSONException e) {
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

          TcpSocket socket = (TcpSocket)key.attachment();

          if (key.isReadable()) {
            try {
              if (socket.read() < 0) {
                selectorMessages.put(
                    new SelectorMessage(socket, SelectorMessageType.SO_DISCONNECTED, null));
              }
            } catch (JSONException e) {
            } catch (InterruptedException e) {
            }
          }

          if (key.isWritable()) {
            socket.dequeueSend();
          }

          if (key.isConnectable()) {
            if (socket.finishConnect()) {
              try {
                selectorMessages.put(
                    new SelectorMessage(socket, SelectorMessageType.SO_CONNECTED, null));
              } catch (InterruptedException e) {
              }
            }
          }
        } // while next

        processPendingMessages();
      }
    }
  }

  private class TcpSocket {
    private final int socketId;
    private final CallbackContext recvContext;

    private SocketChannel channel;

    private SSLEngine sslEngine;
    private JSONObject sslOptions;
    // Buffer used to decrypt ssl data, we have no control on its size
    private ByteBuffer sslPeerAppData;
    private ByteBuffer sslPeerNetData;
    private ByteBuffer sslNetData;

    private BlockingQueue<TcpSendPacket> sendPackets = new LinkedBlockingQueue<TcpSendPacket>();
    private SelectionKey key;

    private boolean paused;

    private boolean persistent;
    private String name;
    private int bufferSize;

    private CallbackContext connectCallback;
    private CallbackContext secureCallback;

    TcpSocket(int socketId, CallbackContext recvContext, JSONObject properties)
        throws JSONException, IOException {
      this.socketId = socketId;
      this.recvContext = recvContext;

      channel = SocketChannel.open();
      channel.configureBlocking(false);

      sslEngine = null;
      sslOptions = null;

      setDefaultProperties();
      setProperties(properties);
      setBufferSize();
    }

    TcpSocket(int socketId, CallbackContext recvContext, SocketChannel acceptedSocket)
        throws IOException {
      this.socketId = socketId;
      this.recvContext = recvContext;

      channel = acceptedSocket;
      channel.configureBlocking(false);

      sslEngine = null;

      setDefaultProperties();
      setBufferSize();
      // accepted socket paused by default
      paused = true;
    }

    void setDefaultProperties() {
      paused = false;
      persistent = false;
      bufferSize = 4096;
      name = "";
    }

    // Only call this method on selector thread
    void addInterestSet(int interestSet) {
      if (key != null) {
        key.interestOps(key.interestOps() | interestSet);
      }
    }

    // Only call this method on selector thread
    void removeInterestSet(int interestSet) {
      if (key != null) {
        key.interestOps(key.interestOps() & ~interestSet);
      }
    }

    int getSocketId() {
      return socketId;
    }

    boolean isConnected() {
      return channel.isOpen() && channel.isConnected();
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
    }

    void setKeepAlive(boolean enable) throws SocketException {
      channel.socket().setKeepAlive(enable);
    }

    void setNoDelay(boolean noDelay) throws SocketException {
      channel.socket().setTcpNoDelay(noDelay);
    }

    boolean connect(String address, int port, CallbackContext connectCallback) throws IOException {
      this.connectCallback = connectCallback;
      if (!channel.isOpen()) {
        channel = SocketChannel.open();
        channel.configureBlocking(false);
        setBufferSize();
      }
      boolean connected = channel.connect(new InetSocketAddress(address, port));
      if (connected) {
        connectCallback.success();
        connectCallback = null;
      }
      return connected;
    }

    boolean finishConnect() {
      if (channel.isConnectionPending() && connectCallback != null) {
        try {
          boolean connected = channel.finishConnect();
          if (connected) {
            connectCallback.success();
            connectCallback = null;
          }
          return connected;
        } catch (IOException e) {
          connectCallback.error(-1000);
          connectCallback = null;
        }
      }
      return false;
    }

    void disconnect() throws IOException {
      if (key != null && channel.isRegistered())
        key.cancel();
      channel.close();
    }

    /**
     * @return whether handshake has been finished.
     */
    boolean handshaking() throws IOException, JSONException {
      SSLEngineResult res;
      switch(sslEngine.getHandshakeStatus()) {
        case FINISHED:
          return false;
        case NEED_TASK:
          Runnable task;
          while((task = sslEngine.getDelegatedTask()) != null) {
            task.run();
          }
          return true;
        case NEED_UNWRAP:
          int bytesRead = channel.read(sslPeerNetData);
          if (bytesRead == -1) {
            handshakeFailed();
            return false;
          }
          sslPeerAppData.clear();
          sslPeerNetData.flip();

          do {
            res = sslEngine.unwrap(sslPeerNetData, sslPeerAppData);
          } while (shouldRedoUnwrap(res));

          sslPeerAppData.flip();
          sslPeerNetData.compact();
          return true;
        case NEED_WRAP:
          ByteBuffer wrapData = ByteBuffer.allocate(sslEngine.getSession().getPacketBufferSize());
          res = sslEngine.wrap(ByteBuffer.allocate(0), wrapData);
          wrapData.flip();
          channel.write(wrapData);
          return true;
        default:
          return false;
      }
    }

    void handshakeFailed() {
      if (secureCallback != null) {
        secureCallback.error(-1000);
        secureCallback = null;
      }
      tearDownSSLEngine();
    }

    void handshakeSuccess() {
      if (secureCallback != null) {
        secureCallback.success();
        secureCallback = null;
      }
    }

    boolean shouldRedoUnwrap(SSLEngineResult res) {
      switch (res.getStatus()) {
        case BUFFER_OVERFLOW:
          increaseSSLAppBuffer();
          return true;
        case BUFFER_UNDERFLOW:
          if (sslPeerNetData.capacity() < sslEngine.getSession().getPacketBufferSize())
            increaseSSLNetBuffer();
          return false;
        case OK:
          return res.getHandshakeStatus() == SSLEngineResult.HandshakeStatus.NEED_UNWRAP &&
              res.bytesProduced() == 0;
        default:
          return false;
      }
    }

    boolean shouldRedoWrap(SSLEngineResult res) {
      switch (res.getStatus()) {
        case BUFFER_OVERFLOW:
          increaseSSLNetBuffer();
          return true;
        default:
          return false;
      }
    }

    void increaseSSLAppBuffer() {
      ByteBuffer newBuffer = ByteBuffer.allocate(
          sslEngine.getSession().getApplicationBufferSize() +
          sslPeerAppData.position());
      sslPeerAppData.flip();
      newBuffer.put(sslPeerAppData);
      sslPeerAppData = newBuffer;
    }

    void increaseSSLNetBuffer() {
      ByteBuffer newBuffer = ByteBuffer.allocate(
          sslEngine.getSession().getPacketBufferSize() +
          sslPeerNetData.position());
      sslPeerNetData.flip();
      newBuffer.put(sslPeerNetData);
      sslPeerNetData = newBuffer;
    }

    void setUpSSLEngine() throws JSONException {
      try {
        sslEngine = SSLContext.getDefault().createSSLEngine();
        sslEngine.setUseClientMode(true);
        sslPeerNetData = ByteBuffer.allocate(sslEngine.getSession().getPacketBufferSize());
        sslNetData = ByteBuffer.allocate(sslEngine.getSession().getPacketBufferSize());
        sslPeerAppData = ByteBuffer.allocate(sslEngine.getSession().getApplicationBufferSize());

        String minVersion = "";
        String maxVersion = "";
        if (sslOptions != null && !sslOptions.isNull("tlsVersion")) {
          JSONObject tlsVersion = sslOptions.getJSONObject("tlsVersion");

          if (!tlsVersion.isNull("min")) {
            minVersion = tlsVersion.getString("min");
          }

          if (!tlsVersion.isNull("max")) {
            maxVersion = tlsVersion.getString("max");
          }
        }

        if (minVersion.startsWith("tls")) {
          sslEngine.setEnabledProtocols(new String[] {"TLSv1"});
        }

        if (maxVersion.startsWith("ssl")) {
          sslEngine.setEnabledProtocols(new String[] {"SSLv3"});
        }

        sslEngine.beginHandshake();
      } catch (SSLException e) {
        handshakeFailed();
      } catch (NoSuchAlgorithmException e) {
        handshakeFailed();
      }
    }

    void tearDownSSLEngine() {
      sslEngine = null;
    }

    void secure(JSONObject options, CallbackContext callbackContext) {
      if (sslEngine != null)
        return;
      secureCallback = callbackContext;
      sslOptions = options;
    }

    void addSendPacket(byte[] data, CallbackContext callbackContext) {
      ByteBuffer appData = ByteBuffer.wrap(data);
      TcpSendPacket sendPacket = new TcpSendPacket(appData, callbackContext);
      try {
        sendPackets.put(sendPacket);
      } catch (InterruptedException e) {
      }
    }

    void dequeueSend() {
      if (sendPackets.peek() == null) {
        removeInterestSet(SelectionKey.OP_WRITE);
        return;
      }

      TcpSendPacket sendPacket = null;
      try {
        int bytesSent = 0;
        sendPacket = sendPackets.take();
        if (sslEngine != null) {
          SSLEngineResult res;
          do {
            res = sslEngine.wrap(sendPacket.data, sslNetData);
          } while (shouldRedoWrap(res));

          sslNetData.flip();
          bytesSent = res.bytesConsumed();

          channel.write(sslNetData);

          sslNetData.clear();
        } else {
          bytesSent = channel.write(sendPacket.data);
        }
        sendPacket.callbackContext.success(bytesSent);
      } catch (InterruptedException e) {
      } catch (IOException e) {
        sendPacket.callbackContext.error(-1000);
      }
    }

    JSONObject getInfo() throws JSONException {

      JSONObject info = new JSONObject();

      info.put("socketId", socketId);
      info.put("persistent", persistent);
      info.put("bufferSize", bufferSize);
      info.put("connected", channel.isConnected());
      info.put("name", name);
      info.put("paused", paused);

      if (channel.socket().getLocalAddress() != null) {
        info.put("localAddress", channel.socket().getLocalAddress().getHostAddress());
        info.put("localPort", channel.socket().getLocalPort());
      }

      if (channel.socket().getInetAddress() != null) {
        info.put("peerAddress", channel.socket().getInetAddress().getHostAddress());
        info.put("peerPort", channel.socket().getPort());
      }

      return info;
    }

    int read() throws JSONException {

      int bytesRead = 0;
      if (paused) {
        removeInterestSet(SelectionKey.OP_READ);
        return bytesRead;
      }

      try {
        if (sslEngine != null) {
          bytesRead = channel.read(sslPeerNetData);
          if (bytesRead < 0)
            return bytesRead;

          sslPeerNetData.flip();

          SSLEngineResult res;
          do {
            res = sslEngine.unwrap(sslPeerNetData, sslPeerAppData);
          } while (shouldRedoUnwrap(res));

          if (res.getStatus() == SSLEngineResult.Status.OK) {
            sslPeerAppData.flip();
            sendReceive(sslPeerAppData);
          }

          sslPeerNetData.compact();
          sslPeerAppData.clear();
        } else {
          ByteBuffer recvData = ByteBuffer.allocate(bufferSize);
          bytesRead = channel.read(recvData);
          if (bytesRead < 0)
            return bytesRead;

          recvData.flip();
          sendReceive(recvData);
        }

      } catch (IOException e) {
        sendReceiveError();
      }
      return bytesRead;
    }

    private void sendReceive(ByteBuffer data) throws JSONException {

      byte[] recvBytes = new byte[data.limit()];
      data.get(recvBytes);

      PluginResult dataResult = new PluginResult(Status.OK, recvBytes);
      dataResult.setKeepCallback(true);
      recvContext.sendPluginResult(dataResult);

      JSONObject metadata = new JSONObject();
      metadata.put("socketId", socketId);
      PluginResult metadataResult = new PluginResult(Status.OK, metadata);
      metadataResult.setKeepCallback(true);
      recvContext.sendPluginResult(metadataResult);
    }

    private void sendReceiveError() throws JSONException {
      JSONObject info = new JSONObject();
      info.put("socketId", socketId);
      info.put("resultCode", -1000);
      PluginResult errResult = new PluginResult(Status.ERROR, info);
      errResult.setKeepCallback(true);
      recvContext.sendPluginResult(errResult);
    }

    private class TcpSendPacket {
      final ByteBuffer data;
      final CallbackContext callbackContext;

      TcpSendPacket(ByteBuffer data, CallbackContext callbackContext) {
        this.data = data;
        this.callbackContext = callbackContext;
      }
    }
  }
}