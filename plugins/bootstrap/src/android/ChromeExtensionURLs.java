// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.apache.cordova;

import java.io.IOException;
import java.io.InputStream;
import java.util.NavigableSet;
import java.util.TreeMap;

import org.apache.cordova.api.CordovaPlugin;

import android.webkit.WebResourceResponse;

public class ChromeExtensionURLs extends CordovaPlugin {

    private static final String LOG_TAG = "ChromeExtensionURLs";
    // Plugins can register themselves to assist or modify the url decoding
    // We use a priority queue to enforce some order
    // Plugins are called in ascending order of priority to modify the url's and the response
    private static TreeMap<Integer, RequestModifyInterface> registeredPlugins =  new TreeMap<Integer, RequestModifyInterface>();

    public static interface RequestModifyInterface
    {
        public String modifyNewRequestUrl(String url);
        public InputStream modifyResponseInputStream(String url, InputStream is);
    }

    public static boolean registerInterfaceAtPriority(RequestModifyInterface plugin, int priority) {
        Integer priorityObj = new Integer(priority);
        if(registeredPlugins.get(priorityObj) != null) {
            return false;
        }
        registeredPlugins.put(priorityObj, plugin);
        return true;
    }

    public static boolean unregisterInterfaceAtPriority(RequestModifyInterface plugin, int priority) {
        Integer priorityObj = new Integer(priority);
        if(registeredPlugins.get(priorityObj) != plugin) {
            return false;
        }
        registeredPlugins.remove(priorityObj);
        return true;
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(String url) {
        // Strip the chrome-extension://<extension_id>/ prefix and then look it up
        // from the Android assets.
        int slash = url.indexOf('/', 19);
        url = url.substring(slash + 1);

        NavigableSet<Integer> pluginPrioritySet = registeredPlugins.navigableKeySet();
        for(Integer pluginPriority : pluginPrioritySet) {
            RequestModifyInterface plugin = registeredPlugins.get(pluginPriority);
            if(plugin != null) {
                url = plugin.modifyNewRequestUrl(url);
            }
        }

        String mimetype = FileHelper.getMimeType(url, this.cordova);
        String encoding = null;
        if (mimetype != null && mimetype.startsWith("text/")) {
            encoding = "UTF-8";
        }

        InputStream is = null;
        try {
            is = this.cordova.getActivity().getAssets().open("www/" + url);
        } catch (IOException ioe) {
            return null;
        }

        for(Integer pluginPriority : pluginPrioritySet) {
            RequestModifyInterface plugin = registeredPlugins.get(pluginPriority);
            if(plugin != null) {
                is = plugin.modifyResponseInputStream(url, is);
            }
        }

        return new WebResourceResponse(mimetype, encoding, is);
    }
}
