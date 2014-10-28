// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.ConfigXmlParser;
import android.content.res.XmlResourceParser;


import android.content.Intent;
import java.net.URL;
import java.net.MalformedURLException;
import android.util.Log;

public class ChromeNavigation extends CordovaPlugin {
    private static final String LOG_TAG = "ChromeNavigation";
    private String startUrl = null;
    private String prevUrl = null;

    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
        final URL baseURL;
        try {
            baseURL = new URL("file:///android_asset/www/");
            new ConfigXmlParser(){
                public void handleStartTag(XmlResourceParser xml) {
                    String strNode = xml.getName();
                    if (strNode.equals("content")) {
                        String src = xml.getAttributeValue(null, "src");
                        if (src != null) {
                            try {
                                startUrl = new URL(baseURL, src).toString();
                            } catch (MalformedURLException err) {}
                        }
                    }
                }
                public void handleEndTag(XmlResourceParser xml) {
                }
            }.parse(cordova.getActivity());
        } catch (MalformedURLException err) {}
    }

    @Override
    public Boolean shouldAllowRequest(String url) {
        return true;
    }

    @Override
    public Boolean shouldAllowNavigation(String url) {
        return url.equals(startUrl);
    }

    @Override
    public Boolean shouldOpenExternalUrl(String url) {
        if (url.startsWith("http:") || url.startsWith("https:")) {
            return true;
        }
        return false;
    }

    @Override
    public Object onMessage(String id, Object data) {
        // Look for top level navigation changes.
        // Using shouldOverrideUrlLoading() would be much more convenient, but it gets triggered by iframe loads :(. 
        if ("onPageStarted".equals(id)) {
            String url = data.toString();
            if (url.startsWith("chrome-extension:")) {
                if (prevUrl != null) {
                    // Assume this is someone refreshing via remote debugger.
                    Log.i(LOG_TAG, "location.reload() detected. Reloading via " + prevUrl);
                    webView.stopLoading();
                    webView.loadUrlIntoView(prevUrl, false);
                }
            } else {
                prevUrl = url;
            }
        }
        return null;
    }
}
