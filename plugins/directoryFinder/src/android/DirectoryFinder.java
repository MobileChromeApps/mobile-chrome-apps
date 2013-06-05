package com.google.cordova;

import org.apache.cordova.CordovaArgs;
import org.apache.cordova.api.CallbackContext;
import org.apache.cordova.api.CordovaPlugin;
import org.json.JSONException;
import org.json.JSONObject;

public class DirectoryFinder extends CordovaPlugin {
    private static int CATEGORY_APP = 0;
    private static int CATEGORY_DATA = 1;
    private static int CATEGORY_DOCUMENTS = 2;

    private static int PERSISTENCE_CACHE = 0;
    private static int PERSISTENCE_DEVICE_PERSISTENT = 1;
    private static int PERSISTENCE_PERSISTENT = 2;
    private static int PERSISTENCE_TEMPORARY = 3;

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("getDirectoryForPurpose".equals(action)) {
            getDirectoryForPurpose(args, callbackContext);
            return true;
        }

        return false;
    }

    private void getDirectoryForPurpose(final CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        boolean sandboxed = args.getBoolean(1);
        int category = args.getInt(2);
        int persistence = args.getInt(3);

        String path = null;

        if (persistence == PERSISTENCE_CACHE || persistence == PERSISTENCE_TEMPORARY) {
            if (sandboxed) {
                path = cordova.getActivity().getApplicationContext().getCacheDir().getAbsolutePath();
            } else {
                path = cordova.getActivity().getApplicationContext().getExternalCacheDir().getAbsolutePath();
            }
        } else if (category == CATEGORY_APP) {
            path = cordova.getActivity().getApplicationContext().getApplicationInfo().dataDir;
        } else if (category == CATEGORY_DOCUMENTS) {
            path = cordova.getActivity().getApplicationContext().getExternalFilesDir(null).getAbsolutePath();
        } else if (category == CATEGORY_DATA) {
            if (sandboxed) {
                path = cordova.getActivity().getApplicationContext().getFilesDir().getAbsolutePath();
            } else {
                path = cordova.getActivity().getApplicationContext().getExternalFilesDir(null).getAbsolutePath();
            }
        }

        if (path == null) {
            callbackContext.error("No path found.");
            return;
        }

        JSONObject directoryEntry = DirectoryFinder.getDirectoryEntryForPath(path);
        callbackContext.success(directoryEntry);
    }

    private static JSONObject getDirectoryEntryForPath(String path) throws JSONException {
        JSONObject directoryEntry = new JSONObject();

        directoryEntry.put("isFile", false);
        directoryEntry.put("isDirectory", true);
        directoryEntry.put("name", path);
        directoryEntry.put("fullPath", path);

        return directoryEntry;
    }
}
