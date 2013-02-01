// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.apache.cordova;

import java.io.IOException;
import java.net.Socket;
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
import org.json.JSONObject;

import android.util.Log;
import android.util.Pair;

public class SocketPlugin extends CordovaPlugin {

    private static final String LOG_TAG = "CordovaSocket";

    Map<Integer, SocketData> sockets = new HashMap<Integer, SocketData>();
    int nextSocket = 1;

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        Log.i("Braden", "action: " + action);
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
        }
        return false;
    }


    private void create(CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        String socketType = args.getString(0);
        Log.i("Braden", "Create " + socketType);
        if (socketType.equals("tcp")) {
            SocketData sd = new SocketData(SocketData.Type.TCP);
            sockets.put(Integer.valueOf(nextSocket), sd);
            callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, nextSocket));
            Log.i("Braden", "Returning socket " + nextSocket);
            nextSocket++;
        } else if (socketType.equals("udp")) {
            Log.w(LOG_TAG, "UDP is not currently supported");
        } else {
            Log.e(LOG_TAG, "Unknown socket type: " + socketType);
        }
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


    private static class SocketData {
        Socket socket;

        public enum Type { TCP, UDP; }
        private Type type;

        BlockingQueue<Pair<Integer, CallbackContext>> readQueue;
        private SocketThread readThread;

        public SocketData(Type type) {
            this.type = type;
        }

        public int connect(String address, int port) {
            try {
                socket = new Socket(address, port);
                readQueue = new LinkedBlockingQueue<Pair<Integer, CallbackContext>>();
                readThread = new SocketThread();
                readThread.start();
            } catch(UnknownHostException uhe) {
                return 1; // error
            } catch(IOException ioe) {
                return 1; // error
            }
            return 0; // success
        }

        public int write(byte[] data) throws JSONException {
            if (socket == null) return -1;

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
            synchronized(readQueue) {
                try {
					readQueue.put(new Pair<Integer, CallbackContext>(Integer.valueOf(bufferLength), context));
				} catch (InterruptedException e) {
					e.printStackTrace();
				}
            }
        }

        public void disconnect() {
            try {
                readThread.setStop();
            	socket.close();
            } catch (IOException ioe) {
            }
            socket = null;
        }

        public void destroy() {
            if (socket != null) {
                disconnect();
            }
        }


        private class SocketThread extends Thread {
            private boolean doStop = false;

            public void run() {
                while (!doStop) {
                    // Read from the blocking queue
                	try {
                		Pair<Integer, CallbackContext> readData = null;
                        while (!doStop && readData == null) {
                            readData = SocketData.this.readQueue.poll(120L, TimeUnit.SECONDS);
                        }
                        if(doStop) return;

                		int toRead = readData.first.intValue();
                		if (toRead <= 0) {
                			toRead = 128;
                		}
                		byte[] out = new byte[toRead];
                		int bytesRead = SocketData.this.socket.getInputStream().read(out);

                        if(doStop) return;

                        // Check for EOF
                        if (bytesRead < 0) {
                            SocketData.this.disconnect();
                            return;
                        }

                        // Copy into a properly-sized array when the size wasn't given.
                        if (readData.first.intValue() <= 0) {
                            byte[] temp = new byte[bytesRead];
                            for (int i = 0; i < bytesRead; i++) {
                                temp[i] = out[i];
                            }
                            out = temp;
                        }

                        Log.i("Braden", "Successfully read: " + new String(out));
                        readData.second.success(out);
                    } catch (IOException ioe) {
                        Log.w(LOG_TAG, "Failed to read from socket.", ioe);
                    } catch (InterruptedException ie) {
                    	Log.w(LOG_TAG, "Thread interrupted", ie);
                    }
                } // while
            } // run()

            public void setStop() {
                doStop = true;
            }
        } // SocketThread
    } // SocketData
}
