// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import org.apache.cordova.CordovaPlugin;

import android.content.Intent;
import android.net.Uri;
import android.util.Log;

public class ChromeNavigation extends CordovaPlugin {
    private static final String LOG_TAG = "ChromeNavigation";
    private String prevUrl = null;

    @Override
    public boolean onOverrideUrlLoading(String url) {
        if (url.startsWith("http:") || url.startsWith("https:")) {
            Log.i(LOG_TAG, "Opening URL in external browser: " + url);
            Intent systemBrowserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            cordova.getActivity().startActivity(systemBrowserIntent);
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
