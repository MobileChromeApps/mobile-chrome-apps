// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import java.net.InetAddress;
import java.net.InterfaceAddress;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.util.ArrayList;
import java.util.Collections;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.util.Log;

public class ChromeSystemNetwork extends CordovaPlugin {
    private static final String LOG_TAG = "ChromeSystemNetwork";

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("getNetworkInterfaces".equals(action)) {
            getNetworkInterfaces(args, callbackContext);
            return true;
        }
        return false;
    }

    private void getNetworkInterfaces(final CordovaArgs args, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONArray ret = new JSONArray();
                    ArrayList<NetworkInterface> interfaces =  Collections.list(NetworkInterface.getNetworkInterfaces());
                    for (NetworkInterface iface : interfaces) {
                        if (iface.isLoopback()) {
                            continue;
                        }
                        for (InterfaceAddress interfaceAddress : iface.getInterfaceAddresses()) {
                            InetAddress address = interfaceAddress.getAddress();
                            if (address == null) {
                                continue;
                            }
                            JSONObject data = new JSONObject();
                            data.put("name", iface.getDisplayName());
                            // Strip address scope zones for IPv6 address.
                            data.put("address", address.getHostAddress().replaceAll("%.*", ""));
                            data.put("prefixLength", interfaceAddress.getNetworkPrefixLength());

                            ret.put(data);
                        }
                    }

                    callbackContext.success(ret);
                } catch (Exception e) {
                    Log.e(LOG_TAG, "Error occured while getting network interfaces", e);
                    callbackContext.error("Could not get network interfaces");
                }
            }
        });
    }
}
