// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.apache.cordova;

import java.io.IOException;
import java.io.InputStream;

import org.apache.cordova.api.CordovaPlugin;

import android.webkit.WebResourceResponse;

public class ChromeExtensionURLs extends CordovaPlugin {

    private static final String LOG_TAG = "ChromeExtensionURLs";

    public WebResourceResponse shouldInterceptRequest(String url) {
        // Strip the chrome-extension://<extension_id>/ prefix and then look it up
        // from the Android assets.
        int slash = url.indexOf('/', 19);
        url = url.substring(slash + 1);

        String mimetype = FileUtils.getMimeType(url);
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

        return new WebResourceResponse(mimetype, encoding, is);
    }
}
