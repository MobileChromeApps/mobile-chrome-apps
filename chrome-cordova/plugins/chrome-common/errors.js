// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

try {
var runtime = require('org.chromium.runtime.runtime');
} catch(e) {}

// Typical Usage:
//
// if (fail_condition)
//   return callbackWithError('You should blah blah', fail, optional_args_to_fail...)
function callbackWithError(msg, callback) {
  var err;
  if (typeof msg == 'string') {
    err = { 'message' : msg };
  } else {
    err = msg;
  }

  if (typeof callback !== 'function') {
    console.error(err.message);
    return;
  }

  try {
    if (typeof runtime !== 'undefined') {
      runtime.lastError = err;
    } else {
      console.error(err.message);
    }

    callback.apply(null, Array.prototype.slice.call(arguments, 2));
  } finally {
    if (typeof runtime !== 'undefined')
      delete runtime.lastError;
  }
}

module.exports = {
  callbackWithError: callbackWithError
};
