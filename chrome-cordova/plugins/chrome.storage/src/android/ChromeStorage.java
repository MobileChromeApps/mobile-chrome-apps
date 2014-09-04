// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.concurrent.locks.ReentrantLock;
import java.util.List;

import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaResourceApi;
import org.apache.cordova.CordovaResourceApi.OpenForReadResult;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.net.Uri;
import android.util.Log;

public class ChromeStorage extends CordovaPlugin {

    private static final String LOG_TAG = "ChromeStorage";
    private ReentrantLock writeLock = new ReentrantLock();

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("get".equals(action)) {
            get(args, callbackContext);
            return true;
        } else if ("getBytesInUse".equals(action)) {
            getBytesInUse(args, callbackContext);
            return true;
        } else if ("set".equals(action)) {
            set(args, callbackContext);
            return true;
        } else if ("remove".equals(action)) {
            remove(args, callbackContext);
            return true;
        } else if ("clear".equals(action)) {
            clear(args, callbackContext);
            return true;
        }

        return false;
    }

    private static List<String> toStringList(JSONArray array) throws JSONException {
        if (array == null) {
            return null;
        }
        List<String> list = new ArrayList<String>();

        for (int i = 0, l = array.length(); i < l; i++) {
            list.add(array.get(i).toString());
        }

        return list;
    }

    private Uri getStorageFile(String namespace) {
        String fileName = "chromestorage_" + namespace;
        File f = cordova.getActivity().getFileStreamPath(fileName);
        return webView.getResourceApi().remapUri(Uri.fromFile(f));
    }

    private JSONObject getStorage(String namespace) throws IOException, JSONException {
        JSONObject oldMap = new JSONObject();
        CordovaResourceApi resourceApi = webView.getResourceApi();
        try {
            OpenForReadResult readResult = resourceApi.openForRead(getStorageFile(namespace));
            ByteArrayOutputStream readBytes = new ByteArrayOutputStream((int)readResult.length);
            resourceApi.copyResource(readResult, readBytes);
            byte[] bytes = readBytes.toByteArray();
            String content = (new String(bytes)).trim();
            if (content.length() > 0) {
                oldMap = new JSONObject(content);
            }
        } catch (FileNotFoundException e) {
            //Suppress the file not found exception
        }
        return oldMap;
    }

    private void setStorage(String namespace, JSONObject map) throws IOException {
        OutputStream outputStream = webView.getResourceApi().openOutputStream(getStorageFile(namespace));
        try {
            outputStream.write(map.toString().getBytes());
        } finally {
            outputStream.close();
        }
    }

    private JSONObject getStoredValuesForKeys(CordovaArgs args, boolean useDefaultValues) {
        JSONObject ret = new JSONObject();
        try {
            String namespace = args.getString(0);
            JSONObject jsonObject = (JSONObject) args.optJSONObject(1);
            JSONArray jsonArray = args.optJSONArray(1);
            boolean isNull = args.isNull(1);
            List<String> keys = new ArrayList<String>();

            if (jsonObject != null) {
                keys = toStringList(jsonObject.names());
                // Ensure default values of keys are maintained
                if (useDefaultValues) {
                    ret = jsonObject;
                }
            } else if (jsonArray != null) {
                keys = toStringList(jsonArray);
            } else if (isNull) {
                keys = null;
            }

            if (keys != null && keys.isEmpty()) {
                ret = new JSONObject();
            } else {
                JSONObject storage = getStorage(namespace);

                if (keys == null) {
                    // return the whole storage if the key given is null
                    ret = storage;
                } else {
                    // return the storage for the keys specified
                    for (String key : keys)    {
                        if (storage.has(key)) {
                            Object value = storage.get(key);
                            ret.put(key, value);
                        }
                    }
                }
            }
        } catch (JSONException e) {
            Log.e(LOG_TAG, "Storage is corrupted!", e);
            ret = null;
        } catch (IOException e) {
            Log.e(LOG_TAG, "Could not retrieve storage", e);
            ret = null;
        }

        return ret;
    }

    private void get(final CordovaArgs args, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                JSONObject storage;
                writeLock.lock();
                try {
                  storage = getStoredValuesForKeys(args, /*useDefaultValues*/ true);
                } finally {
                  writeLock.unlock();
                }

                if (storage == null) {
                    callbackContext.error("Could not retrieve storage");
                } else {
                    callbackContext.success(storage);
                }
            }
        });
    }

    private void getBytesInUse(final CordovaArgs args, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                JSONObject storage;
                writeLock.lock();
                try {
                  //Don't use default values as the keys that don't have values in storage don't affect size
                  storage = getStoredValuesForKeys(args, /*useDefaultValues*/ false);
                } finally {
                  writeLock.unlock();
                }

                if (storage == null) {
                    callbackContext.error("Could not retrieve storage");
                } else {
                    callbackContext.success(storage.toString().getBytes().length);
                }
            }
        });
    }

    private void set(final CordovaArgs args, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    String namespace = args.getString(0);
                    JSONObject jsonObject = (JSONObject) args.getJSONObject(1);
                    JSONArray keyArray = jsonObject.names();
                    JSONObject oldValues = new JSONObject();

                    if (keyArray != null) {
                        List<String> keys = toStringList(keyArray);

                        // Use a lock to serialize updates to storage, to
                        // ensure data is written consistently with
                        // concurrent writers
                        writeLock.lock();

                        try {
                            JSONObject storage = getStorage(namespace);
                            for (String key : keys) {
                                Object oldValue = storage.opt(key);
                                if(oldValue != null) {
                                    oldValues.put(key, oldValue);
                                }
                                storage.put(key, jsonObject.get(key));
                            }
                            setStorage(namespace, storage);
                        } finally {
                            writeLock.unlock();
                        }
                    }
                    callbackContext.success(oldValues);
                } catch (Exception e) {
                    Log.e(LOG_TAG, "Could not update storage", e);
                    callbackContext.error("Could not update storage");
                }
            }
        });
    }

    private void remove(final CordovaArgs args, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    String namespace = args.getString(0);
                    JSONObject jsonObject = (JSONObject) args.optJSONObject(1);
                    JSONArray jsonArray = args.optJSONArray(1);
                    boolean isNull = args.isNull(1);
                    List<String> keys = new ArrayList<String>();
                    JSONObject oldValues = new JSONObject();

                    if (jsonObject != null) {
                        keys = toStringList(jsonObject.names());
                    } else if (jsonArray != null) {
                        keys = toStringList(jsonArray);
                    } else if (isNull) {
                        keys = null;
                    }

                    if (keys != null && !keys.isEmpty()) {
                        // Use a lock to serialize updates to storage, to
                        // ensure data is written consistently with
                        // concurrent writers
                        writeLock.lock();

                        try {
                            JSONObject storage = getStorage(namespace);
                            for(String key : keys) {
                                Object oldValue = storage.opt(key);
                                if(oldValue != null) {
                                    oldValues.put(key, oldValue);
                                }
                                storage.remove(key);
                            }
                            setStorage(namespace, storage);
                        } finally {
                            writeLock.unlock();
                        }
                    }
                    callbackContext.success(oldValues);
                } catch (Exception e) {
                    Log.e(LOG_TAG, "Could not update storage", e);
                    callbackContext.error("Could not update storage");
                }
            }
        });
    }

    private void clear(final CordovaArgs args, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    String namespace = args.getString(0);
                    JSONObject oldValues;

                    // Use a lock to serialize updates to storage, to
                    // ensure data is written consistently with
                    // concurrent writers
                    writeLock.lock();

                    try {
                        oldValues = getStorage(namespace);
                        setStorage(namespace, new JSONObject());
                    } finally {
                        writeLock.unlock();
                    }
                    callbackContext.success(oldValues);
                } catch (Exception e) {
                    Log.e(LOG_TAG, "Could not clear storage", e);
                    callbackContext.error("Could not update storage");
                }
            }
        });
    }
}
