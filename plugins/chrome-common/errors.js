// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

try {
var runtime = require('org.chromium.chrome-app-bootstrap.runtime');
} catch(e) {}

function callbackWithError(msg, callback) {
  console.error(msg);

  if (typeof callback !== 'function')
    return;

  if (typeof runtime !== 'undefined')
    runtime.lastError = { 'message' : msg };

  callback.apply(null, Array.prototype.slice(arguments, 2));

  if (typeof runtime !== 'undefined')
    delete runtime.lastError;
}

module.exports = {
  callbackWithError: callbackWithError
};
