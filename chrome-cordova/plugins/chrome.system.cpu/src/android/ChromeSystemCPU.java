// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import java.io.BufferedReader;
import java.io.FileReader;
import java.lang.System;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.util.Log;

public class ChromeSystemCPU extends CordovaPlugin {
    private static final String LOG_TAG = "ChromeSystemCPU";

    private static final String MODEL_NAME_PREFIX = "model name\t: ";
    private static final String PROCESSOR_PREFIX = "Processor\t: ";

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("getInfo".equals(action)) {
            getInfo(args, callbackContext);
            return true;
        }
        return false;
    }

    private String getOperatingSystemArch() {
        return System.getProperty("os.arch");
    }

    private JSONArray getCpuFeatures() {
        JSONArray ret = new JSONArray();
        // TODO(fbeaufort): Figure out which CPU features are worth returning.
        return ret;
    }

    private String getCpuModelName() {
        // TODO(fbeaufort): Cache CPU Model name.
        String ret = null;
        // Returns the string found in /proc/cpuinfo under the key "model name"
        // or "Processor". "model name" is used in Linux 3.8 and later (3.7 and
        // later for arm64) and is shown once per CPU.  "Processor" is used in
        // earler versions and is shown only once at the top of /proc/cpuinfo
        // regardless of the number CPUs.
        try {
            BufferedReader reader = new BufferedReader(new FileReader("/proc/cpuinfo"));
            String line = null;

            while((line = reader.readLine()) != null) {
                if (line.startsWith(MODEL_NAME_PREFIX)) {
                    ret = line.substring(MODEL_NAME_PREFIX.length());
                    break;
                }
                if (line.startsWith(PROCESSOR_PREFIX)) {
                    ret = line.substring(PROCESSOR_PREFIX.length());
                    break;
                }
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
            // Skip the first line because it is just an aggregated number of
            // all cpuN lines.
            String line = reader.readLine();

            while((line = reader.readLine()) != null) {
                if (!line.startsWith("cpu")) {
                    continue;
                }

                String[] data = line.split(" ");
                Long kernel = Long.valueOf(data[3]);
                Long user = Long.valueOf(data[1]) + Long.valueOf(data[2]);
                Long idle = Long.valueOf(data[4]);
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
                    JSONArray processors = getCpuTimePerProcessor();

                    ret.put("archName", getOperatingSystemArch());
                    ret.put("features", getCpuFeatures());
                    ret.put("modelName", getCpuModelName());
                    ret.put("processors", processors);
                    ret.put("numOfProcessors", processors.length());

                    callbackContext.success(ret);
                } catch (Exception e) {
                    Log.e(LOG_TAG, "Error occured while getting CPU info", e);
                    callbackContext.error("Could not get CPU info");
                }
            }
        });
    }
}
