package org.apache.cordova;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.StreamCorruptedException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.apache.cordova.api.CallbackContext;
import org.apache.cordova.api.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.content.Context;
import android.util.Log;

public class ChromeStorage extends CordovaPlugin {

    private static final String LOG_TAG = "ChromeStorage";
    private ExecutorService executorService = null;

    public ChromeStorage() {
        executorService = Executors.newSingleThreadExecutor();
    }

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

    private static String getStorageFile(boolean sync) {
        return sync? "__chromestorage_sync" : "__chromestorage";
    }

    private JSONObject getStorage(boolean sync) throws StreamCorruptedException, IOException, ClassNotFoundException, JSONException {
        Context context = this.cordova.getActivity();
        File file = new File(context.getFilesDir(), getStorageFile(sync));
        JSONObject oldMap = new JSONObject();

        if(file.exists()) {
            FileInputStream fis = null;
            try {
                fis = new FileInputStream(file);
                byte[] bytes = new byte[(int) file.length()];
                fis.read(bytes);
                String content = (new String(bytes)).trim();
                if (!content.isEmpty()) {
                    oldMap = new JSONObject(content);
                }
            } catch (FileNotFoundException e) {
                //Suppress the file not found exception
            } finally {
                try { fis.close(); } catch (Exception e1) { }
            }
        }
        return oldMap;
    }

    private void setStorage(boolean sync, JSONObject map) throws IOException {
        Context context = this.cordova.getActivity();
        FileOutputStream fos = context.openFileOutput(getStorageFile(sync), Context.MODE_PRIVATE);
        fos.write(map.toString().getBytes());
        fos.close();
    }

    private JSONObject getStoredValuesForKeys(CordovaArgs args, boolean useDefaultValues) {
        JSONObject ret = new JSONObject();
        try {
            boolean sync = args.getBoolean(0);
            JSONObject jsonObject = (JSONObject) args.optJSONObject(1);
            JSONArray jsonArray = args.optJSONArray(1);
            boolean isNull = args.isNull(1);
            List<String> keys = new ArrayList<String>();

            if (jsonObject != null) {
                keys = JSONUtils.toStringList(jsonObject.names());
                // Ensure default values of keys are maintained
                if (useDefaultValues) {
                    ret = jsonObject;
                }
            } else if (jsonArray != null) {
                keys = JSONUtils.toStringList(jsonArray);
            } else if (isNull) {
                keys = null;
            }

            if (keys != null && keys.isEmpty()) {
                ret = new JSONObject();
            } else {
                JSONObject storage = getStorage(sync);

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
        } catch (Exception e) {
            Log.e(LOG_TAG, "Could not retrieve storage", e);
            ret = null;
        }

        return ret;
    }

    private void get(final CordovaArgs args, final CallbackContext callbackContext) {
        executorService.execute(new Runnable() {
            @Override
            public void run() {
                JSONObject storage = getStoredValuesForKeys(args, /*useDefaultValues*/ true);

                if (storage == null) {
                    callbackContext.error("Could not retrieve storage");
                } else {
                    callbackContext.success(storage);
                }
            }
        });
    }

    private void getBytesInUse(final CordovaArgs args, final CallbackContext callbackContext) {
        executorService.execute(new Runnable() {
            @Override
            public void run() {
                //Don't use default values as the keys that don't have values in storage don't affect size
                JSONObject storage = getStoredValuesForKeys(args, /*useDefaultValues*/ false);
        
                if (storage == null) {
                    callbackContext.error("Could not retrieve storage");
                } else {
                    callbackContext.success(storage.toString().getBytes().length);
                }
            }
        });
    }

    private void set(final CordovaArgs args, final CallbackContext callbackContext) {
        executorService.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    boolean sync = args.getBoolean(0);
                    JSONObject jsonObject = (JSONObject) args.getJSONObject(1);
                    JSONArray keyArray = jsonObject.names();
                    JSONObject oldValues = new JSONObject();

                    if (keyArray != null) {
                        List<String> keys = JSONUtils.toStringList(keyArray);
                        JSONObject storage = getStorage(sync);
                        for (String key : keys) {
                            Object oldValue = storage.opt(key);
                            if(oldValue != null) {
                                oldValues.put(key, oldValue);
                            }
                            storage.put(key, jsonObject.get(key));
                        }
                        setStorage(sync, storage);
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
        executorService.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    boolean sync = args.getBoolean(0);
                    JSONObject jsonObject = (JSONObject) args.optJSONObject(1);
                    JSONArray jsonArray = args.optJSONArray(1);
                    boolean isNull = args.isNull(1);
                    List<String> keys = new ArrayList<String>();
                    JSONObject oldValues = new JSONObject();

                    if (jsonObject != null) {
                        keys = JSONUtils.toStringList(jsonObject.names());
                    } else if (jsonArray != null) {
                        keys = JSONUtils.toStringList(jsonArray);
                    } else if (isNull) {
                        keys = null;
                    }

                    if (keys != null && !keys.isEmpty()) {
                        JSONObject storage = getStorage(sync);
                        for(String key : keys) {
                            Object oldValue = storage.opt(key);
                            if(oldValue != null) {
                                oldValues.put(key, oldValue);
                            }
                            storage.remove(key);
                        }
                        setStorage(sync, storage);
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
        executorService.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    boolean sync = args.getBoolean(0);
                    JSONObject oldValues = getStorage(sync);
                    setStorage(sync, new JSONObject());
                    callbackContext.success(oldValues);
                } catch (Exception e) {
                    Log.e(LOG_TAG, "Could not clear storage", e);
                    callbackContext.error("Could not update storage");
                }
            }
        });
    }
}
