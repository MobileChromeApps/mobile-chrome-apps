// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

exports.createStub = function(obj, propName, value) {
  obj.__defineGetter__(propName, function() {
    console.warn('Access made to stub: ' + obj.__namespace__ + '.' + propName);
    return value;
  });
};
