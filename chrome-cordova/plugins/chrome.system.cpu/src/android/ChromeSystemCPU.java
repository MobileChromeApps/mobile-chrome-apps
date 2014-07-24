// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import java.io.BufferedReader;
import java.io.FileReader;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.util.Log;

public class ChromeSystemCPU extends CordovaPlugin {
    private static final String LOG_TAG = "ChromeSystemCPU";

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("getInfo".equals(action)) {
            getInfo(args, callbackContext);
            return true;
        }
        return false;
    }

    private String getCpuModelName() {
        String ret = null;
        try {
            BufferedReader reader = new BufferedReader(new FileReader("/proc/cpuinfo"));
            String line = null;

            while((line = reader.readLine()) != null) {
                Log.d(LOG_TAG, line);
                if (line.length() < 8 || !line.substring(0, 8).equals("Hardware"))
                    continue;

                int pos = line.indexOf(": ");
                ret = line.substring(pos + 2);
            }

            reader.close();
        } catch(Exception e) {
            Log.e(LOG_TAG, "Error occured while getting CPU model name", e);
        }
        return ret;
    }

    private JSONArray getCpuTimePerProcessor() {
        JSONArray ret = new JSONArray();
        try {
            BufferedReader reader = new BufferedReader(new FileReader("/proc/stat"));
            String line = reader.readLine(); // First line is total proc stats.

            while((line = reader.readLine()) != null) {
                if (!line.substring(0, 3).equals("cpu"))
                    continue;

                String[] data = line.split(" ");
                Long kernel = Long.parseLong(data[3]);
                Long user = Long.parseLong(data[1]) + Long.parseLong(data[2]);
                Long idle = Long.parseLong(data[4]);
                JSONObject procStat = new JSONObject();

                procStat.put("kernel", kernel);
                procStat.put("user", user);
                procStat.put("idle", idle);
                procStat.put("total", kernel + user + idle);
                ret.put(procStat);
            }

            reader.close();
        } catch(Exception e) {
            Log.e(LOG_TAG, "Error occured while getting CPU time per processor", e);
        }
        return ret;
    }

    private void getInfo(final CordovaArgs args, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONObject ret = new JSONObject();

                    ret.put("archName", "TODO");
                    ret.put("features", "TODO");
                    ret.put("modelName", getCpuModelName());

                    JSONArray processors = getCpuTimePerProcessor();
                    ret.put("processors", processors);
                    ret.put("numOfProcessors", processors.length());

                    callbackContext.success(ret);
                } catch (Exception e) {
                    Log.e(LOG_TAG, "Error occured while getting info", e);
                    callbackContext.error("Could not get system cpu info");
                }
            }
        });
    }
}
