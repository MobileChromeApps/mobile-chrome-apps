// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.apache.cordova;

import java.io.IOException;
import java.io.InterruptedIOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketException;
import java.net.UnknownHostException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import org.apache.cordova.api.CallbackContext;
import org.apache.cordova.api.CordovaPlugin;
import org.apache.cordova.api.PluginResult;
import org.json.JSONException;

import android.util.Log;

public class ChromeSocket extends CordovaPlugin {

    private static final String LOG_TAG = "ChromeSocket";

    private static Map<Integer, SocketData> sockets = new HashMap<Integer, SocketData>();
    private static int nextSocket = 1;

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("create".equals(action)) {
            create(args, callbackContext);
            return true;
        } else if ("connect".equals(action)) {
            connect(args, callbackContext);
            return true;
        } else if ("write".equals(action)) {
            write(args, callbackContext);
            return true;
        } else if ("read".equals(action)) {
            read(args, callbackContext);
            return true;
        } else if ("disconnect".equals(action)) {
            disconnect(args, callbackContext);
            return true;
        } else if ("destroy".equals(action)) {
            destroy(args, callbackContext);
            return true;
        } else if ("listen".equals(action)) {
            listen(args, callbackContext);
            return true;
        } else if ("accept".equals(action)) {
            accept(args, callbackContext);
            return true;
        }
        return false;
    }


    private void create(CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        String socketType = args.getString(0);
        if (socketType.equals("tcp")) {
            SocketData sd = new SocketData(SocketData.Type.TCP);
            int id = addSocket(sd);
            callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, id));
        } else if (socketType.equals("udp")) {
            Log.w(LOG_TAG, "UDP is not currently supported");
        } else {
            Log.e(LOG_TAG, "Unknown socket type: " + socketType);
        }
    }

    private static int addSocket(SocketData sd) {
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

        int result = sd.connect(address, port);
        callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, result));
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
        callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, result));
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
        sd.listen(address, port, backlog);
        callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, 1));
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


    private static class SocketData {
        Socket socket;
        ServerSocket serverSocket;

        public enum Type { TCP, UDP; }
        private Type type;

        BlockingQueue<ReadData> readQueue;
        private ReadThread readThread;

        BlockingQueue<CallbackContext> acceptQueue;
        private AcceptThread acceptThread;

        private boolean isServer = false;

        public SocketData(Type type) {
            this.type = type;
        }

        public SocketData(Socket incoming) {
            this.type = Type.TCP;
            socket = incoming;
            init();
        }

        public int connect(String address, int port) {
            if (isServer) return 1; // error
            try {
                socket = new Socket(address, port);
                init();
            } catch(UnknownHostException uhe) {
                return 1; // error
            } catch(IOException ioe) {
                return 1; // error
            }
            return 0; // success
        }

        private void init() {
            readQueue = new LinkedBlockingQueue<ReadData>();
            readThread = new ReadThread();
            readThread.start();
        }

        public int write(byte[] data) throws JSONException {
            if (socket == null || isServer) return -1;

            int bytesWritten = 0;
            try {
                socket.getOutputStream().write(data);
                bytesWritten = data.length;
            } catch(IOException ioe) {
                bytesWritten = -1;
            }

            return bytesWritten;
        }

        public void read(int bufferLength, CallbackContext context) {
            if (isServer) {
                context.error("read() is not allowed on server sockets");
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

        public void disconnect() {
            try {
                if (isServer) {
                    acceptThread.setStop();
                    serverSocket.close();
                } else {
                    readQueue.put(new ReadData(true));
                    socket.close();
                }
            } catch (IOException ioe) {
            } catch (InterruptedException ie) {
            }
            socket = null;
            serverSocket = null;
        }

        public void destroy() {
            if (socket != null || serverSocket != null) {
                disconnect();
            }
        }


        public void listen(String address, int port, int backlog) {
            if (type != Type.TCP) return;
            isServer = true;

            try {
                serverSocket = new ServerSocket(port, backlog);
            } catch (IOException ioe) {
                Log.e(LOG_TAG, "Error creating server socket", ioe);
            }
        }

        public void accept(CallbackContext context) {
            if (!isServer) {
                context.error("accept() is not supported on client sockets. Call listen() first.");
                return;
            }

            if (acceptQueue == null && acceptThread == null) {
                acceptQueue = new LinkedBlockingQueue<CallbackContext>();
                acceptThread = new AcceptThread();
                acceptThread.start();
            }

            synchronized(acceptQueue) {
                try {
                    acceptQueue.put(context);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        }

        private static class ReadData {
            public int size;
            public boolean killThread;
            public CallbackContext context;

            public ReadData(int size, CallbackContext context) {
                this.size = size;
                this.context = context;
                this.killThread = false;
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
                        int bytesRead;

                		if (toRead > 0) {
                            out = new byte[toRead];
                            bytesRead = SocketData.this.socket.getInputStream().read(out);
                		} else {
                            int firstByte = SocketData.this.socket.getInputStream().read();
                            out = new byte[SocketData.this.socket.getInputStream().available() + 1];
                            out[0] = (byte) firstByte;
                            bytesRead = SocketData.this.socket.getInputStream().read(out, 1, out.length - 1);
                            bytesRead++;
                        }

                        // Check for EOF
                        if (bytesRead < 0) {
                            SocketData.this.disconnect();
                            return;
                        }

                        readData.context.success(out);
                    } // while
                } catch (IOException ioe) {
                    Socket s = SocketData.this.socket;
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

        private class AcceptThread extends Thread {
            private boolean doStop = false;

            public void run() {
                try {
                    serverSocket.setSoTimeout(120000); // 120 seconds
                } catch (SocketException se) {
                    Log.w(LOG_TAG, "Failed to set timeout for server socket", se);
                }

                while(!doStop) {
                    try {
                        CallbackContext context = null;
                        while (!doStop && context == null) {
                            context = SocketData.this.acceptQueue.poll(120L, TimeUnit.SECONDS);
                        }
                        if (doStop) return;

                        Socket incoming = null;
                        while (!doStop && incoming == null) {
                            try {
                                incoming = serverSocket.accept();
                            } catch (InterruptedIOException iioe) {
                                // Just silently try again.
                            } catch (IOException ioe) {
                                // Just silently try again.
                            }
                        }
                        if (doStop) return;

                        SocketData sd = new SocketData(incoming);
                        int id = ChromeSocket.addSocket(sd);
                        context.sendPluginResult(new PluginResult(PluginResult.Status.OK, id));
                    } catch (InterruptedException ie) {
                        Log.w(LOG_TAG, "Thread interrupted", ie);
                    }
                }
            } // run()

            public void setStop() {
                doStop = true;
            }
        } // AcceptThread
    } // SocketData
}
