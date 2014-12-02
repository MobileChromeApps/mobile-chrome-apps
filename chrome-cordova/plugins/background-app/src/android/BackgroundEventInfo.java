// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import android.os.Bundle;

public class BackgroundEventInfo {
    public String action;
    private Bundle data;

    BackgroundEventInfo(String action) {
        this.action = action;
    }

    Bundle getData() {
        if (data == null)
        {
            data = new Bundle();
        }
        return data;
    }
}
