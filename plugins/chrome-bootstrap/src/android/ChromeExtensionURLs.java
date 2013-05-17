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
import org.apache.cordova.api.DataResource;
import org.apache.cordova.api.DataResourceContext;

import android.annotation.TargetApi;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

public class ChromeExtensionURLs extends CordovaPlugin {

    private static final String LOG_TAG = "ChromeExtensionURLs";
    private static final String CHROME_EXTENSION_SEEN = "ChromeExtensionParsed";
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

    @TargetApi(Build.VERSION_CODES.HONEYCOMB)
    @Override
    public DataResource handleDataResourceRequest(DataResource dataResource, DataResourceContext dataResourceContext) {
        Uri uri = dataResource.getUri();
        String url = uri.toString();
        // Check the scheme to see if we need to handle.
        // Also ensure we haven't intercepted it before
        //  If this check wasn't present, the content-loaded section would go into an infinite loop of data retrieval attempts
        if(uri.getScheme().equals("chrome-extension") && !dataResourceContext.getDataMap().containsKey(CHROME_EXTENSION_SEEN)){
            dataResourceContext.getDataMap().put(CHROME_EXTENSION_SEEN, "");
            NavigableSet<Integer> pluginPrioritySet = registeredPlugins.navigableKeySet();
            for(Integer pluginPriority : pluginPrioritySet) {
                RequestModifyInterface plugin = registeredPlugins.get(pluginPriority);
                if(plugin != null) {
                    url = plugin.modifyNewRequestUrl(url);
                }
            }

            InputStream is = null;
            String filePath = uri.getPath();

            if ("/chrome-content-loaded".equals(filePath)) {
                is = new ByteArrayInputStream("Object.defineProperty(document, 'readyState', {get: function() { return 'loading'}, configurable: true });".getBytes());
            } else {
                url = "file:///android_asset/www" + filePath;
                // We need the input stream below for the modifyResponseInputStream. So we load using a separate request.
                dataResource = DataResource.initiateNewDataRequestForUri(url, this.webView.pluginManager, this.cordova, "ChromeExtensionUrls");
                try {
                    //update the two params we are interested in the url and the inputstream
                    url = dataResource.getUri().toString();
                    is = dataResource.getInputStream();
                } catch (IOException e) {
                    Log.e(LOG_TAG, "Error occurred while trying to load asset", e);
                    return null;
                }
            }

            for(Integer pluginPriority : pluginPrioritySet) {
                RequestModifyInterface plugin = registeredPlugins.get(pluginPriority);
                if(plugin != null) {
                    is = plugin.modifyResponseInputStream(url, is);
                }
            }
            // Let the mimetype, os etc get resolved by the default loaders
            return new DataResource(cordova, Uri.parse(url), is, null /* os */, null /* mimeType */, false /* writable */, null /* realFile */);
        } else {
            return null;
        }
    }
}
