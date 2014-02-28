// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

exports.releaseReadyWait = function() {
  Object.defineProperty(document, 'readyState', {get: function() { return 'interactive'}, configurable: true });
  cordova.fireDocumentEvent('readystatechange');
  cordova.fireDocumentEvent('DOMContentLoaded');
  cordova.fireWindowEvent('DOMContentLoaded');
  Object.defineProperty(document, 'readyState', {get: function() { return 'complete'}, configurable: true });
  cordova.fireDocumentEvent('readystatechange');
  cordova.fireWindowEvent('load');
};
