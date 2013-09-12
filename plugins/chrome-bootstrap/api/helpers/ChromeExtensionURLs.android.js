// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

exports.releaseReadyWait = function() {
  cordova.fireDocumentEvent('DOMContentLoaded');
  Object.defineProperty(document, 'readyState', {get: function() { return 'complete'}, configurable: true });
  cordova.fireWindowEvent('load');
};
