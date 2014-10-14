// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.InterfaceAddress;
import java.net.MulticastSocket;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketException;
import java.net.UnknownHostException;
import java.util.Collection;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.util.Log;

public class ChromeSocket extends CordovaPlugin {

    private static final String LOG_TAG = "ChromeSocket";

    private Map<Integer, SocketData> sockets = new HashMap<Integer, SocketData>();
    private int nextSocket = 1;

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("create".equals(action)) {
            create(args, callbackContext);
        } else if ("connect".equals(action)) {
            connect(args, callbackContext);
        } else if ("bind".equals(action)) {
            bind(args, callbackContext);
        } else if ("write".equals(action)) {
            write(args, callbackContext);
        } else if ("read".equals(action)) {
            read(args, callbackContext);
        } else if ("sendTo".equals(action)) {
            sendTo(args, callbackContext);
        } else if ("recvFrom".equals(action)) {
            recvFrom(args, callbackContext);
        } else if ("disconnect".equals(action)) {
            disconnect(args, callbackContext);
        } else if ("destroy".equals(action)) {
            destroy(args, callbackContext);
        } else if ("listen".equals(action)) {
            listen(args, callbackContext);
        } else if ("accept".equals(action)) {
            accept(args, callbackContext);
        } else if ("getInfo".equals(action)) {
            getInfo(args, callbackContext);
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
        } else {
            return false;
        }
        return true;
    }

    public void onDestroy() {
        destroyAllSockets();
    }

    public void onReset() {
        destroyAllSockets();
    }

    private void destroyAllSockets() {
        if (sockets.isEmpty()) return;

        Log.i(LOG_TAG, "Destroying all open sockets");

        for (Map.Entry<Integer, SocketData> entry : sockets.entrySet())
        {
            SocketData sd = entry.getValue();
            sd.destroy();
        }
        sockets.clear();
    }


    private void create(CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        String socketType = args.getString(0);
        if (socketType.equals("tcp") || socketType.equals("udp")) {
            SocketData sd = new SocketData(socketType.equals("tcp") ? SocketType.TCP : SocketType.UDP);
            int id = addSocket(sd);
            callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, id));
        } else {
            Log.e(LOG_TAG, "Unknown socket type: " + socketType);
        }
    }

    private int addSocket(SocketData sd) {
        sockets.put(Integer.valueOf(nextSocket), sd);
        return nextSocket++;
    }

    private void connect(CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        int socketId = args.getInt(0);
        String address = args.getString(1);
        int port = args.getInt(2);

        SocketData sd = sockets.get(Integer.valueOf(socketId));
        if (sd == null) {
            Log.e(LOG_TAG, "No socket with socketId " + socketId);
            return;
        }

        // The SocketData.connect() method will callback appropriately
        sd.connect(address, port, callbackContext);
    }

    private void bind(CordovaArgs args, final CallbackContext context) throws JSONException {
        int socketId = args.getInt(0);
        String address = args.getString(1);
        int port = args.getInt(2);

        SocketData sd = sockets.get(Integer.valueOf(socketId));
        if (sd == null) {
            Log.e(LOG_TAG, "No socket with socketId " + socketId);
            return;
        }

        boolean success = sd.bind(address, port);
        if(success) context.success();
        else context.error("Failed to bind.");
    }

    private void write(CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        int socketId = args.getInt(0);
        byte[] data = args.getArrayBuffer(1);

        SocketData sd = sockets.get(Integer.valueOf(socketId));
        if (sd == null) {
            Log.e(LOG_TAG, "No socket with socketId " + socketId);
            return;
        }

        int result = sd.write(data);
        if (result <= 0) {
            callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.ERROR, result));
        } else {
            callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, result));
        }
    }

    private void read(CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        int socketId = args.getInt(0);
        int bufferSize = args.getInt(1);

        SocketData sd = sockets.get(Integer.valueOf(socketId));
        if (sd == null) {
            Log.e(LOG_TAG, "No socket with socketId " + socketId);
            return;
        }

        // Will call the callback once it has some data.
        sd.read(bufferSize, callbackContext);
    }

    private void sendTo(CordovaArgs args, final CallbackContext context) throws JSONException {
        JSONObject opts = args.getJSONObject(0);
        int socketId = opts.getInt("socketId");
        String address = opts.getString("address");
        int port = opts.getInt("port");
        byte[] data = args.getArrayBuffer(1);

        SocketData sd = sockets.get(Integer.valueOf(socketId));
        if (sd == null) {
            Log.e(LOG_TAG, "No socket with socketId " + socketId);
            return;
        }

        int result = sd.sendTo(data, address, port);
        if (result <= 0) {
            context.sendPluginResult(new PluginResult(PluginResult.Status.ERROR, result));
        } else {
            context.sendPluginResult(new PluginResult(PluginResult.Status.OK, result));
        }
    }

    private void recvFrom(CordovaArgs args, final CallbackContext context) throws JSONException {
        int socketId = args.getInt(0);
        int bufferSize = args.getInt(1);

        SocketData sd = sockets.get(Integer.valueOf(socketId));
        if (sd == null) {
            Log.e(LOG_TAG, "No socket with socketId " + socketId);
            return;
        }

        sd.recvFrom(bufferSize, context);
    }

    private void disconnect(CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        int socketId = args.getInt(0);

        SocketData sd = sockets.get(Integer.valueOf(socketId));
        if (sd == null) {
            Log.e(LOG_TAG, "No socket with socketId " + socketId);
            return;
        }

        sd.disconnect();
        callbackContext.success();
    }

    private void destroy(CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        int socketId = args.getInt(0);

        SocketData sd = sockets.get(Integer.valueOf(socketId));
        if (sd == null) {
            Log.e(LOG_TAG, "No socket with socketId " + socketId);
            return;
        }

        sd.destroy();
        sockets.remove(Integer.valueOf(socketId));
        callbackContext.success();
    }


    private void listen(CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        int socketId = args.getInt(0);

        SocketData sd = sockets.get(Integer.valueOf(socketId));
        if (sd == null) {
            Log.e(LOG_TAG, "No socket with socketId " + socketId);
            return;
        }

        String address = args.getString(1);
        int port = args.getInt(2);
        int backlog = args.getInt(3);
        boolean success = sd.listen(address, port, backlog);
        if(success) callbackContext.success();
        else callbackContext.error("Failed to listen()");
    }

    private void accept(CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        int socketId = args.getInt(0);

        SocketData sd = sockets.get(Integer.valueOf(socketId));
        if (sd == null) {
            Log.e(LOG_TAG, "No socket with socketId " + socketId);
            return;
        }

        sd.accept(callbackContext);
    }

    private void getInfo(CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        int socketId = args.getInt(0);

        SocketData sd = sockets.get(Integer.valueOf(socketId));
        if (sd == null) {
            Log.e(LOG_TAG, "No socket with socketId " + socketId);
            return;
        }

        JSONObject info = sd.getInfo();
        callbackContext.success(info);
    }

    // Multicast calls
    private void joinGroup(CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        int socketId = args.getInt(0);

        SocketData sd = sockets.get(Integer.valueOf(socketId));
        if (sd == null) {
            Log.e(LOG_TAG, "No socket with socketId " + socketId);
            return;
        }

        String address = args.getString(1);
        int ret = sd.joinGroup(address);
        callbackContext.success(ret);
    }

    private void leaveGroup(CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        int socketId = args.getInt(0);

        SocketData sd = sockets.get(Integer.valueOf(socketId));
        if (sd == null) {
            Log.e(LOG_TAG, "No socket with socketId " + socketId);
            return;
        }

        String address = args.getString(1);
        int ret = sd.leaveGroup(address);
        callbackContext.success(ret);
    }

    private void setMulticastTimeToLive(CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        int socketId = args.getInt(0);

        SocketData sd = sockets.get(Integer.valueOf(socketId));
        if (sd == null) {
            Log.e(LOG_TAG, "No socket with socketId " + socketId);
            return;
        }

        int ttl = args.getInt(1);
        int ret = sd.setMulticastTimeToLive(ttl);
        callbackContext.success(ret);
    }

    private void setMulticastLoopbackMode(CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        int socketId = args.getInt(0);

        SocketData sd = sockets.get(Integer.valueOf(socketId));
        if (sd == null) {
            Log.e(LOG_TAG, "No socket with socketId " + socketId);
            return;
        }

        boolean enabled = args.getBoolean(1);
        int ret = sd.setMulticastLoopbackMode(enabled);
        callbackContext.success(ret);
    }

    private void getJoinedGroups(CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        int socketId = args.getInt(0);

        SocketData sd = sockets.get(Integer.valueOf(socketId));
        if (sd == null) {
            Log.e(LOG_TAG, "No socket with socketId " + socketId);
            return;
        }

        Collection<String> ret = sd.getJoinedGroups();
        callbackContext.success(new JSONArray(ret));
    }

    private enum SocketType { TCP, UDP; }

    private class SocketData {
        Socket tcpSocket;
        DatagramSocket udpSocket;
        MulticastSocket multicastSocket;
        ServerSocket serverSocket;

        private SocketType type;

        // Cached values used by UDP read()/write().
        // These are the REMOTE address and port.
        private InetAddress address;
        private int port;

        private int localPort;

        private boolean connected = false; // Only applies to UDP, where connect() restricts who the socket will receive from.
        private boolean bound = false;

        private boolean isServer = false;

        private boolean multicast = false;

        private ConnectThread connectThread;

        BlockingQueue<ReadData> readQueue;
        private ReadThread readThread;

        BlockingQueue<AcceptData> acceptQueue;
        private AcceptThread acceptThread;

        private HashSet<String> multicastGroups;


        public SocketData(SocketType type) {
            this.type = type;
        }

        public SocketData(Socket incoming) {
            this.type = SocketType.TCP;
            tcpSocket = incoming;
            connected = true;
            address = incoming.getInetAddress();
            port = incoming.getPort();
            init();
        }

        public JSONObject getInfo() throws JSONException {
            JSONObject info = new JSONObject();
            info.put("socketType", type == SocketType.TCP ? "tcp" : "udp");

            // According to the chrome.socket docs, this is always true for TCP sockets post-connect calls,
            // and for UDP it's true iff the connect() call has been used to set default remotes.
            // That's exactly what the boolean connected tracks.
            info.put("connected", connected);

            if (connected || isServer || bound) {
                if (connected) {
                    info.put("peerAddress", address.getHostAddress());
                    info.put("peerPort", port);
                }

                if (isServer) { // TCP server socket
                    info.put("localAddress", serverSocket.getInetAddress().getHostAddress());
                    info.put("localPort", serverSocket.getLocalPort());
                } else if (type == SocketType.TCP) {
                    info.put("localAddress", tcpSocket.getLocalAddress().getHostAddress());
                    info.put("localPort", tcpSocket.getLocalPort());
                } else { // UDP socket
                    info.put("localAddress", udpSocket.getLocalAddress().getHostAddress());
                    info.put("localPort", udpSocket.getLocalPort());
                }
            }

            return info;
        }

        public boolean connect(String address, int port, CallbackContext callbackContext) {
            if (isServer) return false;
            try {
                if (type == SocketType.TCP) {
                    connected = true;
                    this.address = InetAddress.getByName(address);
                    this.port = port;
                    
                    this.connectThread = new ConnectThread(this.address, port, callbackContext);
                    this.connectThread.start();
                } else {
                    if (udpSocket == null) {
                        udpSocket = new DatagramSocket();
                    }
                    this.port = port;
                    this.address = InetAddress.getByName(address);
                    this.connected = true;
                    udpSocket.connect(this.address, port);
                    init();

                    callbackContext.success();
                }
            } catch(UnknownHostException uhe) {
                Log.e(LOG_TAG, "Unknown host exception while connecting socket", uhe);
                callbackContext.error("Unknown Host");
                return false;
            } catch(IOException ioe) {
                Log.e(LOG_TAG, "IOException while connecting socket", ioe);
                callbackContext.error("IOException");
                return false;
            }
            return true;
        }

        public void init() {
            readQueue = new LinkedBlockingQueue<ReadData>();
            readThread = new ReadThread();
            readThread.start();
        }

        public void udpInit() {
            try {
                udpSocket = new DatagramSocket();
            } catch (SocketException se) {
                Log.w(LOG_TAG, "SocketException while trying to create a UDP socket in sendTo()", se);
                return;
            }
            init();
        }

        public boolean bind(String address, int port) {
            if (type != SocketType.UDP) {
                Log.e(LOG_TAG, "bind() cannot be called on TCP sockets.");
                return false;
            }

            try {
                if (udpSocket == null) {
                    udpSocket = new DatagramSocket(port);
                    init();
                } else {
                    udpSocket.bind(new InetSocketAddress(port));
                }
                this.bound = true;
                this.localPort = port;
            } catch (SocketException se) {
                Log.e(LOG_TAG, "Failed to create UDP socket.", se);
                return false;
            }
            return true;
        }

        public int write(byte[] data) throws JSONException {
            if ((tcpSocket == null && udpSocket == null) || isServer) return -1;

            int bytesWritten = 0;
            try {
                if (type == SocketType.TCP) {
                    tcpSocket.getOutputStream().write(data);
                    bytesWritten = data.length;
                } else {
                    if (!connected) {
                        Log.e(LOG_TAG, "Cannot write() to unconnected UDP socket.");
                        return -1;
                    }

                    DatagramPacket packet = new DatagramPacket(data, data.length, this.address, this.port);
                    udpSocket.send(packet);
                    bytesWritten = data.length;
                }
            } catch(IOException ioe) {
                Log.w(LOG_TAG, "IOException while writing to socket", ioe);
                bytesWritten = -1;
            }

            return bytesWritten;
        }

        public int sendTo(byte[] data, String address, int port) {
            if (type != SocketType.UDP) {
                Log.w(LOG_TAG, "sendTo() can only be called for UDP sockets.");
                return -1;
            }

            // Create the socket and initialize the reading side, if connect() was never called.
            if (udpSocket == null) {
                udpInit();
            }

            int bytesWritten = 0;
            try {
                DatagramPacket packet = new DatagramPacket(data, data.length, InetAddress.getByName(address), port);
                udpSocket.send(packet);
                bytesWritten = data.length;
            } catch (IOException ioe) {
                Log.w(LOG_TAG, "IOException in sendTo", ioe);
                bytesWritten = -1;
            }

            return bytesWritten;
        }

        public void read(int bufferLength, CallbackContext context) {
            if (isServer) {
                context.error("read() is not allowed on server sockets");
                return;
            }

            if (type == SocketType.UDP && !bound && !connected) {
                context.error("read() is not allowed on unbound UDP sockets.");
                return;
            }

            synchronized(readQueue) {
                try {
					readQueue.put(new ReadData(bufferLength, context));
				} catch (InterruptedException e) {
					e.printStackTrace();
				}
            }
        }

        public void recvFrom(int bufferSize, CallbackContext context) {
            if (type != SocketType.UDP) {
                context.error("recvFrom() is not allowed on non-UDP sockets");
                return;
            }

            // Create the socket and initialize the reading side, if connect() was never called.
            if (!bound) {
                context.error("Cannot recvFrom() without bind() first.");
                return;
            }

            synchronized(readQueue) {
                try {
                    // Flagged as recvFrom, therefore the two-part callback.
                    readQueue.put(new ReadData(bufferSize, context, true));
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        }

        public void disconnect() {
            try {
                if (isServer) {
                    // acceptQueue is null when listen has been called but not accept().
                    if (acceptQueue != null) {
                        acceptQueue.put(new AcceptData(true));
                    }
                    serverSocket.close();
                // readQueue == null means that connect() failed.
                } else if (multicastSocket != null) {
                    for(String address : multicastGroups) {
                        multicastSocket.leaveGroup(InetAddress.getByName(address));
                    }
                    multicastSocket.close();
                    multicastGroups = null;
                    if (readQueue != null) {
                        readQueue.put(new ReadData(true));
                    }
                } else if (readQueue != null) {
                    readQueue.put(new ReadData(true));
                    if(type == SocketType.TCP) {
                        tcpSocket.close();
                    } else {
                        udpSocket.close();
                    }
                }
            } catch (IOException ioe) {
            } catch (InterruptedException ie) {
            }
            tcpSocket = null;
            udpSocket = null;
            serverSocket = null;
            multicastSocket = null;
        }

        public void destroy() {
            if (tcpSocket != null || udpSocket != null || serverSocket != null || multicastSocket != null) {
                disconnect();
            }
        }


        public boolean listen(String address, int port, int backlog) {
            if (type != SocketType.TCP) return false;
            isServer = true;

            try {
                serverSocket = new ServerSocket();
                serverSocket.setReuseAddress(true);
                serverSocket.bind(new InetSocketAddress(port), backlog);
            } catch (IOException ioe) {
                Log.e(LOG_TAG, "Error creating server socket", ioe);
                return false;
            }
            return true;
        }

        public void accept(CallbackContext context) {
            if (!isServer) {
                context.error("accept() is not supported on client sockets. Call listen() first.");
                return;
            }

            if (acceptQueue == null && acceptThread == null) {
                acceptQueue = new LinkedBlockingQueue<AcceptData>();
                acceptThread = new AcceptThread();
                acceptThread.start();
            }

            synchronized(acceptQueue) {
                try {
                    acceptQueue.put(new AcceptData(context));
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        }

        // Multicast handlers
        public int joinGroup(String address) {
            try {
                if (type != SocketType.UDP) {
                    Log.e(LOG_TAG, "joinGroup not allowed with TCP sockets.");
                    return -5; // INVALID_HANDLE
                }

                if (multicastSocket == null) {
                    if (!bound) {
                        Log.e(LOG_TAG, "joinGroup not allowed unless socket is bound to a port");
                        return -15; // SOCKET_NOT_CONNECTED
                    }

                    // Unbind and destroy my UDP socket, since it's no longer needed.
                    udpSocket.close();
                    udpSocket = null;

                    multicastSocket = new MulticastSocket(localPort);
                    multicastGroups = new HashSet<String>();
                    multicast = true;
                }

                if (multicastGroups.contains(address)) {
                    Log.e(LOG_TAG, "Attempted to join an already joined multicast group.");
                    return -147; // ADDRESS_IN_USE
                }

                multicastGroups.add(address);
                multicastSocket.joinGroup(InetAddress.getByName(address));
                return 0;
            } catch (IOException ioe) {
                Log.e(LOG_TAG, "Exception while joining multicast group: " + ioe);
                return -2; // FAILED
            }
        }

        public int leaveGroup(String address) {
            try {
                if (!multicast) {
                    Log.e(LOG_TAG, "Not a multicast socket");
                    return -2; // FAILED
                }

                if (multicastGroups.contains(address)) {
                    multicastGroups.remove(address);
                    multicastSocket.leaveGroup(InetAddress.getByName(address));
                    return 0;
                }
            } catch (IOException ioe) {
                Log.e(LOG_TAG, "Exception while leaving multicast group: " + ioe);
            }

            return -2; // FAILED
        }

        public int setMulticastTimeToLive(int ttl) {
            try {
                if (multicast) {
                    if (0 <= ttl && ttl <= 255) {
                        multicastSocket.setTimeToLive(ttl);
                        return 0;
                    } else {
                        return -4; // INVALID_ARGUMENT
                    }
                }
            } catch (IOException ioe) {
                Log.e(LOG_TAG, "Exception while setting multicast TTL: " + ioe);
            }
            return -2; // FAILED
        }

        public int setMulticastLoopbackMode(boolean enabled) {
            try {
                if (multicast) {
                    multicastSocket.setLoopbackMode(!enabled);
                    return 0;
                }
            } catch (IOException ioe) {
                Log.e(LOG_TAG, "Exception while setting multicast loopback mode: " + ioe);
            }
            return -2; // FAILED
        }


        public Collection<String> getJoinedGroups() {
            return multicastGroups;
        }


        private class ConnectThread extends Thread {
            private CallbackContext callbackContext;
            private InetAddress address;
            private int port;

            public ConnectThread(InetAddress address, int port, CallbackContext callbackContext) {
                this.address = address;
                this.port = port;
                this.callbackContext = callbackContext;
            }

            public void run() {
                try {
                    SocketData.this.tcpSocket = new Socket(this.address, this.port);
                    SocketData.this.init();

                    callbackContext.success();
                } catch (Exception e) {
                    callbackContext.error("An error occurred");
                }
            }
        }


        private class ReadData {
            public int size;
            public boolean killThread;
            public boolean recvFrom;
            public CallbackContext context;

            public ReadData(int size, CallbackContext context) {
                this.size = size;
                this.context = context;
                this.killThread = false;
                this.recvFrom = false;
            }

            public ReadData(int size, CallbackContext context, boolean recvFrom) {
                this.size = size;
                this.context = context;
                this.killThread = false;
                this.recvFrom = recvFrom;
            }

            public ReadData(boolean killThread) {
                this.killThread = true;
            }
        }


        private class ReadThread extends Thread {
            public void run() {
                try {
                    while (true) {
                    // Read from the blocking queue
                		ReadData readData = SocketData.this.readQueue.take();
                        if(readData.killThread) return;

                		int toRead = readData.size;
                        byte[] out;
                        byte[] outResized;
                        int bytesRead;

                        if (type == SocketType.TCP) {
                            try {
                                if (toRead > 0) {
                                    out = new byte[toRead];
                                    bytesRead = SocketData.this.tcpSocket.getInputStream().read(out);
                                } else {
                                    int firstByte = SocketData.this.tcpSocket.getInputStream().read();
                                    out = new byte[SocketData.this.tcpSocket.getInputStream().available() + 1];
                                    out[0] = (byte) firstByte;
                                    bytesRead = SocketData.this.tcpSocket.getInputStream().read(out, 1, out.length - 1);
                                    bytesRead++;
                                }

                                // Check for EOF
                                if (bytesRead < 0) {
                                    SocketData.this.disconnect();
                                    return;
                                }

                                if (bytesRead < toRead) {
                                    outResized = new byte[bytesRead];
                                    System.arraycopy(out, 0, outResized, 0, bytesRead);
                                    readData.context.success(outResized);
                                } else {
                                    readData.context.success(out);
                                }
                            } catch (NullPointerException e) {
                                SocketData.this.readQueue.put(readData);
                            } catch (SocketException e) {
                                readData.context.error("Socket closed");
                            }
                        } else {
                            if (toRead > 0) {
                                out = new byte[toRead];
                            } else {
                                out = new byte[4096]; // Defaults to 4K chunks.
                            }

                            DatagramPacket packet = new DatagramPacket(out, out.length);
                            if (multicastSocket != null && readData.recvFrom) {
                            	multicastSocket.receive(packet);
                            } else {
                                udpSocket.receive(packet);
                            }

                            // Truncate the buffer if the message was shorter than it.
                            if (packet.getLength() != out.length) {
                                byte[] temp = new byte[packet.getLength()];
                                for(int i = 0; i < packet.getLength(); i++) {
                                    temp[i] = out[i];
                                }
                                out = temp;
                            }

                            PluginResult dataResult = new PluginResult(PluginResult.Status.OK, out);
                            // If this was a recvFrom() call, keep the callback for the two-part response.
                            // If this was a read() call, don't keep the callback.
                            dataResult.setKeepCallback(readData.recvFrom);
                            readData.context.sendPluginResult(dataResult);

                            if (readData.recvFrom) {
                                JSONObject obj = new JSONObject();
                                try {
                                    obj.put("address", packet.getAddress().getHostAddress());
                                    obj.put("port", packet.getPort());
                                } catch (JSONException je) {
                                    Log.e(LOG_TAG, "Error constructing JSON object to return from recvFrom()", je);
                                    return;
                                }
                                readData.context.success(obj);
                            }
                        }
                    } // while
                } catch (IOException ioe) {
                    Socket s = SocketData.this.tcpSocket;
                    if (s != null && s.isClosed()) {
                        Log.i(LOG_TAG, "Socket closed.");
                    } else {
                        Log.w(LOG_TAG, "Failed to read from socket.", ioe);
                    }
                } catch (InterruptedException ie) {
                    Log.w(LOG_TAG, "Thread interrupted", ie);
                }
            } // run()
        } // ReadThread

        private class AcceptData {
            public boolean killThread;
            public CallbackContext context;

            public AcceptData(boolean killThread) {
                this.killThread = killThread;
            }

            public AcceptData(CallbackContext context) {
                this.context = context;
                this.killThread = false;
            }
        }

        private class AcceptThread extends Thread {
            public void run() {
                try {
                    while(true) {
                        AcceptData acceptData = SocketData.this.acceptQueue.take();
                        if (acceptData.killThread) return;

                        Socket incoming = SocketData.this.serverSocket.accept();
                        if (SocketData.this.serverSocket == null || SocketData.this.serverSocket.isClosed()) {
                            if (incoming != null) incoming.close();
                            return;
                        }

                        SocketData sd = new SocketData(incoming);
                        int id = ChromeSocket.this.addSocket(sd);
                        acceptData.context.sendPluginResult(new PluginResult(PluginResult.Status.OK, id));
                    }
                } catch (InterruptedException ie) {
                    Log.w(LOG_TAG, "Thread interrupted", ie);
                } catch (IOException ioe) {
                    if (SocketData.this.serverSocket == null || SocketData.this.serverSocket.isClosed()) {
                        Log.i(LOG_TAG, "Killing accept() thread; server socket closed.");
                    } else {
                        Log.w(LOG_TAG, "Error in accept() thread.", ioe);
                    }
                }
            } // run()
        } // AcceptThread
    } // SocketData
}
