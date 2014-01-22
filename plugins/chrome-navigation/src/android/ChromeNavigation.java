// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import org.apache.cordova.Config;
import org.apache.cordova.CordovaPlugin;

import android.content.Intent;
import android.net.Uri;
import android.util.Log;

public class ChromeNavigation extends CordovaPlugin {
    private static final String LOG_TAG = "ChromeNavigation";

    @Override
    public boolean onOverrideUrlLoading(String url) {
        if (url.startsWith("http:") || url.startsWith("https:")) {
            Log.i(LOG_TAG, "Opening URL in external browser: " + url);
            Intent systemBrowserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            cordova.getActivity().startActivity(systemBrowserIntent);
            return true;
        } else if (url.startsWith("chrome-extension:")) {
            // Assume this is someone refreshing via remote debugger.
            Log.i(LOG_TAG, "location.reload() detected. Reloading via chromeapp.html");
            webView.loadUrl(Config.getStartUrl());
            return true;
        }
        return false;
    }

}
