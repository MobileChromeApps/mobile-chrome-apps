// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import java.io.File;
import java.lang.String;
import java.util.HashMap;
import java.util.UUID;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.support.v4.content.ContextCompat;
import android.util.Log;

public class ChromeSystemStorage extends CordovaPlugin {

    private static final String LOG_TAG = "ChromeSystemStorage";
    private static final String DATA_STORAGE_PATH = "StoragePath";

    private static BackgroundEventHandler<ChromeSystemStorage> eventHandler;

    private String builtinStorageId = null;
    private HashMap<String, String> externalStorageIds = null;

    private class StorageFile {
        public File path;
        public String type;

        public StorageFile(File path, String type) {
            this.path = path;
            this.type = type;
        }
    }

    public static BackgroundEventHandler<ChromeSystemStorage> getEventHandler() {
        // TODO: Need to worry about concurrency?
        if (eventHandler == null) {
            eventHandler = createEventHandler();
        }
        return eventHandler;
    }

    private static BackgroundEventHandler<ChromeSystemStorage> createEventHandler() {

        return new BackgroundEventHandler<ChromeSystemStorage>() {

            @Override
            public BackgroundEventInfo mapBroadcast(Context context, Intent intent) {

                String action = intent.getAction();
                if (!(
                        Intent.ACTION_MEDIA_MOUNTED.equals(action) ||
                        Intent.ACTION_MEDIA_BAD_REMOVAL.equals(action) ||
                        Intent.ACTION_MEDIA_REMOVED.equals(action) ||
                        Intent.ACTION_MEDIA_SHARED.equals(action) ||
                        Intent.ACTION_MEDIA_UNMOUNTED.equals(action)
                    )) {
                    // Ignore any other actions
                    return null;
                }

                BackgroundEventInfo event = new BackgroundEventInfo(action);
                event.getData().putString(DATA_STORAGE_PATH, intent.getDataString());

                return event;
            }

            @Override
            public void mapEventToMessage(BackgroundEventInfo event, JSONObject message) throws JSONException {
                boolean attached = Intent.ACTION_MEDIA_MOUNTED.equals(event.action);

                // Sanitize the path provided with the event
                String storagePath = getBaseStoragePath(Uri.parse(event.getData().getString(DATA_STORAGE_PATH)).getPath());

                ChromeSystemStorage plugin = getCurrentPlugin();

                // The attached/detached events may fire before the client has a chance to call getInfo().
                // Thus, must initialize the external storage here (if not already done), to ensure that
                // unit ids are consistent across calls to getInfo, and subsequent attach/detach events.
                StorageFile[] directories = plugin.initializeExternalStorageDirectories();

                String unitId = plugin.getExternalStorageId(storagePath);
                StorageFile attachedStorage = null;
                if (attached) {
                    attachedStorage = plugin.getExternalStorageDirectoryByPath(storagePath, directories);
                } else {
                    // If the detached event causes initialization, the unit id may not be found
                    // as it won't be reported in the list of directories.  We can safely generate
                    // a random id, as the client won't have called getInfo yet.
                    if (unitId == null) {
                        unitId = UUID.randomUUID().toString();
                    }
                }

                message.put("action", attached ? "attached" : "detached");
                message.put("id", unitId);
                if (attached) {
                    JSONObject storageUnit = plugin.buildExternalStorageUnitInfo(attachedStorage);

                    message.put("info", storageUnit);
                }
            }
        };
    }

    @Override
    public void pluginInitialize() {
        getEventHandler().pluginInitialize(this);
    }

    @Override
    public void onReset() {
        //TODO: Can we handle in BackgroundPlugin, and cleanup per plugin there?
        //messageChannel = null;
    }

    @Override
    public void onDestroy() {
        //TODO: Can we handle in BackgroundPlugin, and cleanup per plugin there?
        //messageChannel = null;
    }

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("getInfo".equals(action)) {
            getInfo(args, callbackContext);
        } else if ("ejectDevice".equals(action)) {
            ejectDevice(args, callbackContext);
        } else if ("getAvailableCapacity".equals(action)) {
            getAvailableCapacity(args, callbackContext);
        }

        if (getEventHandler().pluginExecute(this, action, args, callbackContext)) {
            return true;
        }

        return true;
    }

    private String getExternalStorageId(String storagePath) {
        return externalStorageIds.get(storagePath);
    }

    private String getBuiltInStorageId() {
        if (builtinStorageId == null) {
            builtinStorageId = UUID.randomUUID().toString();
        }
        return builtinStorageId;
    }

    private boolean isBuiltInStorageId(String unitId) {
        return getBuiltInStorageId().equalsIgnoreCase(unitId);
    }

    private File getBuiltInStorageDirectory() {
        return cordova.getActivity().getFilesDir();
    }

    private String getExternalStoragePath(String unitId) {
        // The unit ids are stored in the map where key = path, value = id,
        // so must iterate and check each value
        if (externalStorageIds == null) {
            return null;
        }
        for (HashMap.Entry<String, String> entry : externalStorageIds.entrySet()) {
            if (entry.getValue().equalsIgnoreCase(unitId)) {
                return entry.getKey();
            }
        }
        return null;
    }

    private boolean isExternalStorageId(String unitId) {
        String path = getExternalStoragePath(unitId);

        return (path != null);
    }

    private File getExternalStorageDirectoryById(String unitId) {
        String path = getExternalStoragePath(unitId);

        if (path == null) {
            return null;
        }

        File[] directories = getExternalStorageDirectories();

        for (File storage : directories) {
            if (storage == null) {
                continue;
            }

            // The underlying file system may (or may not) be case-sensitive (e.g. SD cards often
            // use FAT, which is case-insensitive).
            // Regardless, the matching of unit id to directory ignores case, as we do not expect
            // to have two external storage directories, whose path differs only by case
            if (getBaseStoragePath(storage).equalsIgnoreCase(path)) {
                return storage;
            }
        }

        return null;
    }

    private StorageFile getExternalStorageDirectoryByPath(String path, StorageFile[] directories) {

        for (StorageFile storage : directories) {
            if (storage == null) {
                continue;
            }

            if (getBaseStoragePath(storage.path).equalsIgnoreCase(path)) {
                return storage;
            }
        }

        return null;
    }

    private StorageFile[] initializeExternalStorageDirectories() {
        // Setup the mapping from external storage paths to unit ids.  According to the
        // chrome.system.storage api, the unit ids need to be consistent within a given
        // "run" of the app, but are otherwise transient.
        // Here, we are considering the pause/resume of an activity to be different "runs". Thus,
        // the mapping can simply be stored in a map associated with the plugin instance.

        if (externalStorageIds == null) {
            externalStorageIds = new HashMap<String, String>();
        }

        File[] directories = getExternalStorageDirectories();
        StorageFile[] files = new StorageFile[directories.length];

        for (int i = 0; i < directories.length; i++) {
            File storage = directories[i];
            if (storage == null) {
                files[i] = null;
                continue;
            }

            // Determine the type of storage
            //  - By convention, the first entry in list represents the emulated external
            //    storage, which is considered as not removable
            //  - The second and following entries represent physical external storage,
            //    and are considered to be removable (e.g. SD card)
            // See: https://developer.android.com/reference/android/content/Context.html#getExternalFilesDirs(java.lang.String)
            files[i] = new StorageFile(
                    storage,
                    (i == 0) ? "fixed" : "removable"
            );

            String storagePath = getBaseStoragePath(storage);

            if (externalStorageIds.containsKey(storagePath)) {
                continue;
            }

            String id = UUID.randomUUID().toString();
            externalStorageIds.put(storagePath, id);
        }

        return files;
    }

    private File[] getExternalStorageDirectories() {
        return ContextCompat.getExternalFilesDirs(cordova.getActivity(), null);
    }

    private JSONObject buildStorageUnitInfo(String id, File directory, String type, String name)
            throws JSONException
    {
        JSONObject storageUnit = new JSONObject();

        storageUnit.put("id", id);
        storageUnit.put("name", name);
        storageUnit.put("type", type);
        storageUnit.put("capacity", directory.getTotalSpace());

        return storageUnit;
    }

    private JSONObject buildExternalStorageUnitInfo(StorageFile directory)
            throws JSONException
    {
        String shortPath = getBaseStoragePath(directory.path);

        // Get the id based on the path for the directory
        String id = getExternalStorageId(shortPath);

        return buildStorageUnitInfo(id, directory.path, directory.type, shortPath);
    }

    private static String getBaseStoragePath(File directory) {
        return getBaseStoragePath(directory.getAbsolutePath());
    }

    private static String getBaseStoragePath(String fullPath) {
        // The generated storage paths will typically be an app-specific directory to store files
        // We want to use a shorter, more generic path
        int pos = fullPath.indexOf("/Android/data");
        if (pos >= 2) {
            // Found the string somewhere after a root directory
            return fullPath.substring(0, pos);
        }
        return fullPath;
    }

    private JSONObject buildAvailableCapacityInfo(String id, File directory)
            throws JSONException
    {
        JSONObject storageUnit = new JSONObject();

        storageUnit.put("id", id);
        storageUnit.put("availableCapacity", directory.getFreeSpace());

        return storageUnit;
    }

    private void getInfo(final CordovaArgs args, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONArray ret = new JSONArray();

                    // Return unit representing the built-in, internal storage
                    //  - Context.getFilesDir() provides access to the app directory in internal storage
                    JSONObject builtinStorage = buildStorageUnitInfo(
                            getBuiltInStorageId(),
                            getBuiltInStorageDirectory(),
                            "fixed",
                            "Built-in Storage"
                    );
                    ret.put(builtinStorage);

                    // Return unit(s) representing external storage (if available)
                    StorageFile[] directories = initializeExternalStorageDirectories();
                    for (StorageFile externalStorageDirectory : directories) {
                        if (externalStorageDirectory != null) {
                            JSONObject externalStorage = buildExternalStorageUnitInfo(
                                    externalStorageDirectory
                            );
                            ret.put(externalStorage);
                        }
                    }

                    callbackContext.success(ret);
                } catch (Exception e) {
                    Log.e(LOG_TAG, "Error occurred while getting Storage info", e);
                    callbackContext.error("Could not get Storage info");
                }
            }
        });
    }

    private void ejectDevice(final CordovaArgs args, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    String result;
                    String unitId = args.getString(0);

                    if (isBuiltInStorageId(unitId)) {
                        // Provided the id for the built-in storage, which can never be ejected
                        result = "in_use";
                    }
                    else if (isExternalStorageId(unitId)) {
                        // Provided the id for external storage, which typically cannot be ejected
                        // Even Android devices without an SD will have external storage, which
                        // is emulated (see http://source.android.com/devices/tech/storage/index.html)
                        result = "in_use";
                    }
                    else
                    {
                        result = "no_such_device";
                    }

                    callbackContext.success(result);
                } catch (Exception e) {
                    Log.e(LOG_TAG, "Error occurred while ejecting device", e);
                    callbackContext.error("Could not eject device");
                }
            }
        });
    }

    private void getAvailableCapacity(final CordovaArgs args, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    String unitId = args.getString(0);

                    if (isBuiltInStorageId(unitId)) {
                        callbackContext.success(
                                buildAvailableCapacityInfo(unitId, getBuiltInStorageDirectory()));
                        return;
                    }

                    File externalStorageDirectory = getExternalStorageDirectoryById(unitId);
                    if (externalStorageDirectory != null) {
                        callbackContext.success(
                                buildAvailableCapacityInfo(unitId, externalStorageDirectory));
                        return;
                    }

                    // Unknown device, return "undefined" for consistency with desktop behaviour
                    //  - This also covers the case where an id for external storage was provided,
                    //    but external storage is not currently available.
                    callbackContext.success((String) null);
                } catch (Exception e) {
                    Log.e(LOG_TAG, "Error occurred while getting available capacity", e);
                    callbackContext.error("Could not get available capacity");
                }
            }
        });
    }

}
