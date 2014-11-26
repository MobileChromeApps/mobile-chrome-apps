// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import android.os.Bundle;
import android.view.View;

import org.apache.cordova.CordovaActivity;
import org.apache.cordova.CordovaWebView;

public class BackgroundAppMainActivity extends CordovaActivity
{
    // This just makes it so that we don't have to tell people to remove the loadUrl() call from
    // their onCreate() template.
    private boolean ignoreLoadUrlFromDefaultTemplate;

    @Override
    public void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);
        CordovaWebView existingWebView = BackgroundActivity.stealWebView(this);
        appView = existingWebView;
        init();
        if (existingWebView == null) {
            loadUrl(launchUrl);
        } else {
            ignoreLoadUrlFromDefaultTemplate = true;
            // Undo the hide-for-splash-screen logic.
            appView.getView().setVisibility(View.VISIBLE);
        }
    }

    @Override
    protected CordovaWebView makeWebView() {
        if (appView != null) {
            return appView;
        }
        return super.makeWebView();
    }

    @Override
    public void loadUrl(String url) {
        if (!ignoreLoadUrlFromDefaultTemplate) {
            super.loadUrl(url);
        }
        ignoreLoadUrlFromDefaultTemplate = false;
    }
}
