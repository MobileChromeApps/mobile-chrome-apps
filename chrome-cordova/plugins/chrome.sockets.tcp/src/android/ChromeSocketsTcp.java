package org.chromium;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.SocketException;
import java.nio.ByteBuffer;
import java.nio.channels.SelectionKey;
import java.nio.channels.Selector;
import java.nio.channels.SocketChannel;
import java.nio.channels.UnresolvedAddressException;
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

import android.net.Uri;
import android.util.Log;

public class ChromeSocketsTcp extends CordovaPlugin {

  private static final String LOG_TAG = "ChromeSocketsTcp";

  private Map<Integer, TcpSocket> sockets = new ConcurrentHashMap<Integer, TcpSocket>();
  private BlockingQueue<SelectorMessage> selectorMessages =
      new LinkedBlockingQueue<SelectorMessage>();
  private int nextSocket = 1;
  private CallbackContext recvContext;
  private Selector selector;
  private SelectorThread selectorThread;
  private boolean isReadyToRead;

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
    } else if ("pipeToFile".equals(action)) {
      pipeToFile(args, callbackContext);
    } else if ("registerReceiveEvents".equals(action)) {
      registerReceiveEvents(args, callbackContext);
    } else if ("readyToRead".equals(action)) {
      readyToRead();
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

  private void sendReceiveEvent(PluginResult result) {
    if (recvContext != null) {
      result.setKeepCallback(true);
      recvContext.sendPluginResult(result);
    }
  }

  public int registerAcceptedSocketChannel(SocketChannel socketChannel)
      throws IOException {
    TcpSocket socket = new TcpSocket(nextSocket++, socketChannel);
    sockets.put(Integer.valueOf(socket.getSocketId()), socket);

    addSelectorMessage(socket, SelectorMessageType.SO_ACCEPTED, null);

    return socket.getSocketId();
  }

  private void create(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    JSONObject properties = args.getJSONObject(0);

    try {
      TcpSocket socket = new TcpSocket(nextSocket++, properties);
      sockets.put(Integer.valueOf(socket.getSocketId()), socket);
      callbackContext.success(socket.getSocketId());
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
    if (paused) {
      // Read interest will be removed when socket is readable on selector thread.
      callbackContext.success();
    } else {
      // All interests need to be modified in selector thread.
      addSelectorMessage(socket, SelectorMessageType.SO_ADD_READ_INTEREST, callbackContext);
    }
  }

  private void setKeepAlive(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    int socketId = args.getInt(0);
    boolean enable = args.getBoolean(1);

    TcpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      callbackContext.error(buildErrorInfo(-4, "Invalid Argument"));
      return;
    }

    try {
      socket.setKeepAlive(enable);
      callbackContext.success();
    } catch (SocketException e) {
      callbackContext.error(buildErrorInfo(-2, e.getMessage()));
    }
  }

  private void setNoDelay(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    int socketId = args.getInt(0);
    boolean noDelay = args.getBoolean(1);

    TcpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      callbackContext.error(buildErrorInfo(-4, "Invalid Argument"));
      return;
    }

    try {
      socket.setNoDelay(noDelay);
      callbackContext.success();
    } catch (SocketException e) {
      callbackContext.error(buildErrorInfo(-2, e.getMessage()));
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
      callbackContext.error(buildErrorInfo(-4, "Invalid Argument"));
      return;
    }

    try {
      if (socket.connect(peerAddress, peerPort, callbackContext)) {
        addSelectorMessage(socket, SelectorMessageType.SO_CONNECTED, null);
      } else {
        addSelectorMessage(socket, SelectorMessageType.SO_CONNECT, null);
      }
    } catch (IOException e) {
      callbackContext.error(buildErrorInfo(-104, e.getMessage()));
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

    addSelectorMessage(socket, SelectorMessageType.SO_DISCONNECTED, callbackContext);
  }

  private void secure(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    int socketId = args.getInt(0);
    JSONObject options = args.getJSONObject(1);

    TcpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      callbackContext.error(buildErrorInfo(-4, "Invalid Argument"));
      return;
    }

    if (!socket.isConnected()) {
      Log.e(LOG_TAG, "Socket is not connected with host " + socketId);
      callbackContext.error(buildErrorInfo(-15, "Socket not connected"));
      return;
    }

    String minVersion = "";
    String maxVersion = "";
    if (options != null && !options.isNull("tlsVersion")) {
      JSONObject tlsVersion = options.getJSONObject("tlsVersion");

      if (!tlsVersion.isNull("min")) {
        minVersion = tlsVersion.getString("min");
      }

      if (!tlsVersion.isNull("max")) {
        maxVersion = tlsVersion.getString("max");
      }
    }

    socket.setSecureCallbackAndOptions(minVersion, maxVersion, callbackContext);
    addSelectorMessage(socket, SelectorMessageType.SSL_INIT_HANDSHAKE, null);
  }

  private void send(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {
    int socketId = args.getInt(0);
    byte[] data = args.getArrayBuffer(1);

    TcpSocket socket = sockets.get(Integer.valueOf(socketId));

    if (socket == null) {
      Log.e(LOG_TAG, "No socket with socketId " + socketId);
      callbackContext.error(buildErrorInfo(-4, "Invalid Argument"));
      return;
    }

    if (!socket.isConnected()) {
      Log.e(LOG_TAG, "Socket is not connected with host " + socketId);
      callbackContext.error(buildErrorInfo(-15, "Socket not connected"));
      return;
    }

    socket.addSendPacket(data, callbackContext);

    // All interests need to be modified in selector thread.
    addSelectorMessage(socket, SelectorMessageType.SO_ADD_WRITE_INTEREST, null);
  }

  private void closeAllSockets() {
    for (TcpSocket socket: sockets.values()) {
      addSelectorMessage(socket, SelectorMessageType.SO_CLOSE, null);
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

    addSelectorMessage(socket, SelectorMessageType.SO_CLOSE, callbackContext);
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

  private void pipeToFile(CordovaArgs args, final CallbackContext callbackContext)
      throws JSONException {

    final int socketId = args.getInt(0);
    final JSONObject options = args.getJSONObject(1);

    final TcpSocket socket = sockets.get(Integer.valueOf(socketId));

    // Use a background thread because setProperties may perform IO operations.
    cordova.getThreadPool().execute(new Runnable() {
        public void run() {
          String errMessage = null;
          try {
            if(!socket.setPipeToFileProperties(options, callbackContext)) {
              errMessage = "Failed to start pipeToFile";
            }
          } catch (IOException e) {
            errMessage = e.getMessage();
          }

          if (errMessage != null) {
            try {
              JSONObject info = buildErrorInfo(-1000, errMessage);
              info.put("socketId", socketId);
              sendReceiveEvent(new PluginResult(Status.ERROR, info));
            } catch (JSONException e) {
            }
          }
        }
      });
  }

  private void registerReceiveEvents(CordovaArgs args, final CallbackContext callbackContext) {
    recvContext = callbackContext;
    startSelectorThread();
    readyToRead();
  }

  private void readyToRead() {
    isReadyToRead = true;
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
      TcpSocket socket, SelectorMessageType type, CallbackContext callbackContext) {
    try {
      selectorMessages.put(new SelectorMessage(
          socket, type, callbackContext));
      if (selector != null)
        selector.wakeup();
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
    private BlockingQueue<SelectorMessage> selectorMessages;
    private Map<Integer, TcpSocket> sockets;
    private boolean running = true;

    SelectorThread(
        BlockingQueue<SelectorMessage> selectorMessages,
        Map<Integer, TcpSocket> sockets) {
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
              break;
            case SO_CLOSE:
              msg.socket.disconnect();
              sockets.remove(Integer.valueOf(msg.socket.getSocketId()));
              break;
            case SSL_INIT_HANDSHAKE:
              msg.socket.setUpSSLEngine();

              boolean hasWork = true;
              while(hasWork) {
                hasWork = msg.socket.performNextHandshakeStep();
              }

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
          if (msg.callbackContext != null)
            msg.callbackContext.success();
        } catch (InterruptedException e) {
        } catch (IOException e) {
          if (msg.callbackContext != null)
            msg.callbackContext.error(buildErrorInfo(-2, e.getMessage()));
        } catch (JSONException e) {
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

          TcpSocket socket = (TcpSocket)key.attachment();

          if (key.isReadable()) {
            try {
              if (socket.read() < 0) {
                addSelectorMessage(socket, SelectorMessageType.SO_DISCONNECTED, null);
              }
            } catch (JSONException e) {
            }
          }

          if (key.isWritable()) {
            socket.dequeueSend();
          }

          if (key.isConnectable()) {
            if (socket.finishConnect()) {
              addSelectorMessage(socket, SelectorMessageType.SO_CONNECTED, null);
            }
          }
        } // while next
        processPendingMessages();
      }
    }
  }

  private class TcpSocket {

    private final static long PIPE_TO_FILE_PROGRESS_INTERVAL = 100000000; // nano seconds

    private final int socketId;

    private SocketChannel channel;

    private ByteBuffer receiveDataBuffer;

    private SSLEngine sslEngine;
    private String sslMinVersion;
    private String sslMaxVersion;
    // Buffer used to decrypt SSL data, we have no control on its size
    private ByteBuffer sslPeerAppBuffer;
    private ByteBuffer sslNetBuffer;

    private BlockingQueue<TcpSendPacket> sendPackets = new LinkedBlockingQueue<TcpSendPacket>();
    private SelectionKey key;

    private boolean paused;

    private boolean persistent;
    private String name;
    private int bufferSize;

    // pipeToFile properties
    private Uri uri;
    private OutputStream uriOutputStream;
    private boolean append;
    private int numBytes;
    private CallbackContext pipeToFileCallback;
    private long bytesReadNotSend;
    private long lastProgressTimestamp;

    private CallbackContext connectCallback;
    private CallbackContext secureCallback;

    TcpSocket(int socketId, JSONObject properties)
        throws JSONException, IOException {
      this.socketId = socketId;

      channel = SocketChannel.open();
      channel.configureBlocking(false);

      sslEngine = null;
      sslMinVersion = "";
      sslMaxVersion = "";

      setDefaultProperties();
      setProperties(properties);
      setBufferSize();
    }

    TcpSocket(int socketId, SocketChannel acceptedSocket)
        throws IOException {
      this.socketId = socketId;

      channel = acceptedSocket;
      channel.configureBlocking(false);

      sslEngine = null;

      setDefaultProperties();
      setBufferSize();
      // accepted socket paused by default
      paused = true;
    }

    void resetPipeToFileProperties() throws IOException {
      if (uriOutputStream != null) {
        uriOutputStream.close();
        uriOutputStream = null;
        uri = null;
      }
      pipeToFileCallback = null;
      append = false;
      numBytes = 0;
      bytesReadNotSend = 0;
    }

    void setDefaultProperties() throws IOException {
      paused = false;
      persistent = false;
      bufferSize = 4096;
      name = "";
      resetPipeToFileProperties();
    }

    // Only call this method on selector thread
    void addInterestSet(int interestSet) {
      if (key != null && key.isValid()) {
        key.interestOps(key.interestOps() | interestSet);
      }
    }

    // Only call this method on selector thread
    void removeInterestSet(int interestSet) {
      if (key != null && key.isValid()) {
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

    boolean setPipeToFileProperties(JSONObject properties, CallbackContext callbackContext)
        throws IOException {

      resetPipeToFileProperties();

      append = properties.optBoolean("append");
      numBytes = properties.optInt("numBytes");

      if (numBytes <= 0)
        return false;

      pipeToFileCallback = callbackContext;

      String uriString = properties.optString("uri");

      if (uriString.length() > 0) {
        Uri outputUri = Uri.parse(uriString);
        uriOutputStream = webView.getResourceApi().openOutputStream(outputUri, append);
        // Only update the uri if the output uri is valid for openOutputStream()
        uri = outputUri;
      } else {
        return false;
      }
      lastProgressTimestamp = System.nanoTime();
      return true;
    }

    void setBufferSize() throws SocketException {
      channel.socket().setSendBufferSize(bufferSize);
      channel.socket().setReceiveBufferSize(bufferSize);
      receiveDataBuffer = ByteBuffer.allocate(bufferSize);
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
      if (!channel.isOpen()) {
        channel = SocketChannel.open();
        channel.configureBlocking(false);
        setBufferSize();
      }

      boolean connected = false;
      try {
        connected = channel.connect(new InetSocketAddress(address, port));
      } catch (UnresolvedAddressException e) {
        connectCallback.error(e.getMessage());
      }

      if (connected) {
        connectCallback.success();
      } else {
        this.connectCallback = connectCallback;
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
          connectCallback.error(buildErrorInfo(-104, e.getMessage()));
          connectCallback = null;
        }
      }
      return false;
    }

    void disconnect() throws IOException {
      if (key != null && channel.isRegistered())
        key.cancel();
      resetPipeToFileProperties();
      channel.close();
    }

    /**
     * @return whether further handshake need to be performed.
     */
    boolean performNextHandshakeStep() throws IOException, JSONException {
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
          int bytesRead = channel.read(receiveDataBuffer);
          if (bytesRead == -1) {
            handshakeFailed();
            return false;
          }
          tryUnwrapReceiveData();
          return true;
        case NEED_WRAP:
          ByteBuffer wrapData = ByteBuffer.allocate(sslEngine.getSession().getPacketBufferSize());
          sslEngine.wrap(ByteBuffer.allocate(0), wrapData);
          wrapData.flip();
          channel.write(wrapData);
          return true;
        default:
          return false;
      }
    }

    void handshakeFailed() {
      if (secureCallback != null) {
        secureCallback.error(buildErrorInfo(-148, "SSL handshake not completed"));
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

    SSLEngineResult tryUnwrapReceiveData() throws SSLException {

      receiveDataBuffer.flip();
      sslPeerAppBuffer.clear();

      SSLEngineResult res;
      do {
        res = sslEngine.unwrap(receiveDataBuffer, sslPeerAppBuffer);
      } while (maybeGrowBuffersForUnwrap(res));

      sslPeerAppBuffer.flip();
      receiveDataBuffer.compact();

      return res;
    }

    boolean maybeGrowBuffersForUnwrap(SSLEngineResult res) {
      switch (res.getStatus()) {
        case BUFFER_OVERFLOW:
          increaseSSLPeerAppBuffer();
          return true;
        case BUFFER_UNDERFLOW:
          increaseReceiveDataBuffer();
          // Need another read to get enough data to unwrap.
        case OK:
        default:
          return false;
      }
    }

    boolean maybeGrowBuffersForWrap(SSLEngineResult res) {
      switch (res.getStatus()) {
        case BUFFER_OVERFLOW:
          increaseSSLNetBuffer();
          return true;
        default:
          return false;
      }
    }

    void increaseSSLPeerAppBuffer() {
      // Increase the capacity of sslPeerAppBuffer to the size needed to decrypt
      // inbound data.
      ByteBuffer newBuffer = ByteBuffer.allocate(
          sslEngine.getSession().getApplicationBufferSize() +
          sslPeerAppBuffer.position());
      sslPeerAppBuffer.flip();
      newBuffer.put(sslPeerAppBuffer);
      sslPeerAppBuffer = newBuffer;
    }

    void increaseReceiveDataBuffer() {
      // Increase the capacity of the receiveDataBuffer for next receive if
      // needed.
      if (receiveDataBuffer.capacity() < sslEngine.getSession().getPacketBufferSize()) {
        ByteBuffer newBuffer = ByteBuffer.allocate(
            sslEngine.getSession().getPacketBufferSize() +
            receiveDataBuffer.position());
        receiveDataBuffer.flip();
        newBuffer.put(receiveDataBuffer);
        receiveDataBuffer = newBuffer;
      }
    }

    void increaseSSLNetBuffer() {
      // Increase the capacity of sslNetBuffer to the size needed to encrypt
      // outbound data.
      ByteBuffer newBuffer = ByteBuffer.allocate(
          sslEngine.getSession().getPacketBufferSize() +
          sslNetBuffer.position());
      sslNetBuffer.flip();
      newBuffer.put(sslNetBuffer);
      sslNetBuffer = newBuffer;
    }

    void setUpSSLEngine() throws JSONException {
      try {
        sslEngine = SSLContext.getDefault().createSSLEngine();
        sslEngine.setUseClientMode(true);
        receiveDataBuffer = ByteBuffer.allocate(sslEngine.getSession().getPacketBufferSize());
        sslNetBuffer = ByteBuffer.allocate(sslEngine.getSession().getPacketBufferSize());
        sslPeerAppBuffer = ByteBuffer.allocate(sslEngine.getSession().getApplicationBufferSize());

        // TODO: TLS1.1 and TLS1.2 is supported and enabled by default for API 20+.
        if (sslMinVersion.startsWith("tls")) {
          sslEngine.setEnabledProtocols(new String[] {"TLSv1"});
        }

        if (sslMaxVersion.startsWith("ssl")) {
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

    void setSecureCallbackAndOptions(
        String minVersion, String maxVersion, CallbackContext callbackContext) {
      if (sslEngine != null)
        return;

      sslMinVersion = minVersion;
      sslMaxVersion = maxVersion;
      secureCallback = callbackContext;
    }

    void addSendPacket(byte[] data, CallbackContext callbackContext) {
      ByteBuffer appData = ByteBuffer.wrap(data);
      TcpSendPacket sendPacket = new TcpSendPacket(appData, callbackContext);
      try {
        sendPackets.put(sendPacket);
      } catch (InterruptedException e) {
      }
    }

    // This method can be only called by selector thread.
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
            res = sslEngine.wrap(sendPacket.data, sslNetBuffer);
          } while (maybeGrowBuffersForWrap(res));

          sslNetBuffer.flip();
          bytesSent = res.bytesConsumed();

          channel.write(sslNetBuffer);

          sslNetBuffer.clear();
        } else {
          bytesSent = channel.write(sendPacket.data);
        }
        sendPacket.callbackContext.success(bytesSent);
      } catch (InterruptedException e) {
      } catch (IOException e) {
        sendPacket.callbackContext.error(buildErrorInfo(-2, e.getMessage()));
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

    // This method can be only called by selector thread.
    int read() throws JSONException {

      int bytesRead = 0;
      if (paused) {
        // Remove read interests to avoid seletor wakeup when readable.
        removeInterestSet(SelectionKey.OP_READ);
        return bytesRead;
      }

      // This may cause starvation if multiple sockets are trying to reading
      // large amount of data at same time.
      if (!isReadyToRead && uriOutputStream == null) {
        return bytesRead;
      }

      try {
        bytesRead = channel.read(receiveDataBuffer);
        if (bytesRead < 0)
          throw new IOException("Socket closed by remote peer");

        if (sslEngine != null) {

          SSLEngineResult res = tryUnwrapReceiveData();

          if (res.getStatus() == SSLEngineResult.Status.OK) {
            sendReceive(sslPeerAppBuffer);
          }
        } else {
          receiveDataBuffer.flip();
          sendReceive(receiveDataBuffer);
          receiveDataBuffer.clear();
        }


      } catch (IOException e) {
        JSONObject info = buildErrorInfo(-2, e.getMessage());
        info.put("socketId", socketId);
        sendReceiveEvent(new PluginResult(Status.ERROR, info));
      } catch (JSONException e) {
      }
      return bytesRead;
    }

    private void sendReceive(ByteBuffer data) throws JSONException, IOException {
      byte[] recvBytes = null;
      if (uriOutputStream != null) {
        byte[] pipeBytes = null;
        if (numBytes >= data.remaining()) {
          pipeBytes = new byte[data.remaining()];
          data.get(pipeBytes);
        } else {
          pipeBytes = new byte[numBytes];
          data.get(pipeBytes);
          recvBytes = new byte[data.remaining()];
          data.get(recvBytes);
        }

        uriOutputStream.write(pipeBytes);
        uriOutputStream.flush();

        numBytes -= pipeBytes.length;

        long timestamp = System.nanoTime();

        bytesReadNotSend += pipeBytes.length;
        if (numBytes == 0 || timestamp - lastProgressTimestamp > PIPE_TO_FILE_PROGRESS_INTERVAL) {
          JSONObject info = new JSONObject();
          info.put("socketId", socketId);
          info.put("uri", uri.toString());
          info.put("bytesRead", bytesReadNotSend);
          sendReceiveEvent(new PluginResult(Status.OK, info));
          lastProgressTimestamp = timestamp;
          bytesReadNotSend = 0;
        }

        if (numBytes == 0) {
          pipeToFileCallback.success();
          resetPipeToFileProperties();
        }
      } else {
        // TODO: avoid this copy by creating a new PluginResult overload.
        recvBytes = new byte[data.remaining()];
        data.get(recvBytes);
      }

      if (recvBytes != null) {
        JSONObject info = new JSONObject();
        info.put("socketId", socketId);
        sendReceiveEvent(new PluginResult(Status.OK, info));
        isReadyToRead = false;
        sendReceiveEvent(new PluginResult(Status.OK, recvBytes));
      }
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
