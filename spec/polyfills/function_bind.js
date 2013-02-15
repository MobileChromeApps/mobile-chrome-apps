// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

if (!Function.prototype.bind) {
  Object.defineProperty(Function.prototype, 'bind', { value: function(ctx) {
    var func = this;
    var boundArgs = Array.prototype.slice.call(arguments, 1);
    return function() {
      var newArgs = boundArgs.concat(boundArgs.slice.call(arguments));
      return func.apply(ctx, newArgs);
    };
  }});
}
