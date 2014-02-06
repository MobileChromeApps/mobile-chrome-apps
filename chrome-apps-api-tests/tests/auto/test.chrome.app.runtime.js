// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerAutoTests('chrome.app.runtime', function(runningInBackground) {
  'use strict';
  it('should have onLaunched exist', function() {
    expect(chrome.app.runtime.onLaunched).not.toBeUndefined();
  });
});
