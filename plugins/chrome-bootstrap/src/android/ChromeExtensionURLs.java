// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package com.google.cordova;

import java.io.IOException;
import java.io.InputStream;
import java.io.ByteArrayInputStream;
import java.util.NavigableSet;
import java.util.TreeMap;

import org.apache.cordova.api.CordovaPlugin;
import org.apache.cordova.UriResolver;
import org.apache.cordova.UriResolvers;

import android.annotation.TargetApi;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

public class ChromeExtensionURLs extends CordovaPlugin {

    private static final String LOG_TAG = "ChromeExtensionURLs";
    // Plugins can register themselves to assist or modify the url decoding
    // We use a priority queue to enforce some order
    // Plugins are called in ascending order of priority to modify the url's and the response
    private static TreeMap<Integer, RequestModifyInterface> registeredPlugins =  new TreeMap<Integer, RequestModifyInterface>();

    public static interface RequestModifyInterface
    {
        public Uri modifyNewRequestUrl(Uri uri);
        public InputStream modifyResponseInputStream(Uri uri, InputStream is);
    }

    public static boolean registerInterfaceAtPriority(RequestModifyInterface plugin, int priority) {
        Integer priorityObj = priority;
        if(registeredPlugins.get(priorityObj) != null) {
            return false;
        }
        registeredPlugins.put(priorityObj, plugin);
        return true;
    }

    public static boolean unregisterInterfaceAtPriority(RequestModifyInterface plugin, int priority) {
        Integer priorityObj = priority;
        if(registeredPlugins.get(priorityObj) != plugin) {
            return false;
        }
        registeredPlugins.remove(priorityObj);
        return true;
    }

    @Override
    public UriResolver resolveUri(Uri uri) {
        // Check the scheme to see if we need to handle.
        // Also ensure we haven't intercepted it before
        //  If this check wasn't present, the content-loaded section would go into an infinite loop of data retrieval attempts
        if (!uri.getScheme().equals("chrome-extension")) {
            return null;
        }
        NavigableSet<Integer> pluginPrioritySet = registeredPlugins.navigableKeySet();
        for(Integer pluginPriority : pluginPrioritySet) {
            RequestModifyInterface plugin = registeredPlugins.get(pluginPriority);
            if(plugin != null) {
                uri = plugin.modifyNewRequestUrl(uri);
            }
        }

        InputStream is = null;
        String filePath = uri.getPath();

        if ("/chrome-content-loaded".equals(filePath)) {
            return UriResolvers.createInline(uri, "Object.defineProperty(document, 'readyState', {get: function() { return 'loading'}, configurable: true });", "text/javascript");
        }

        // We need the input stream below for the modifyResponseInputStream. So we load using a separate request.
        uri = new Uri.Builder().scheme("file").path("android_asset" + filePath).build();
        UriResolver resolver = webView.resolveUri(uri);

        try {
            // update the two params we are interested in the url and the inputstream
            is = resolver.getInputStream();

            for (Integer pluginPriority : pluginPrioritySet) {
                RequestModifyInterface plugin = registeredPlugins.get(pluginPriority);
                if (plugin != null) {
                    is = plugin.modifyResponseInputStream(uri, is);
                }
            }
            // Let the mimetype, os etc get resolved by the default loaders
            return UriResolvers.createReadOnly(uri, is, resolver.getMimeType());
        } catch (IOException e) {
            Log.e(LOG_TAG, "Error occurred while trying to load asset", e);
            return null;
        }
    }
}
