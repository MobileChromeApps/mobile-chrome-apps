// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import org.apache.cordova.CordovaPlugin;

import android.content.Intent;
import android.net.Uri;

public class ChromeNavigation extends CordovaPlugin {

    @Override
    public boolean onOverrideUrlLoading(String url) {
        Intent systemBrowserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        cordova.getActivity().startActivity(systemBrowserIntent);
        return true;
    }

}
