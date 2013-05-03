// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function chromeSpec(name, func) {
  chromespec.registerJasmineTestInstance(!!window.runningInBg, name, func);
}

function itShouldHaveAnEvent(obj, eventName) {
  it('should have an event called ' + eventName, function() {
    expect(obj[eventName]).toEqual(jasmine.any(chrome.Event));
  });
}

function itShouldHaveAPropertyOfType(obj, propName, typeName) {
  it('should have a "' + propName + '" ' + typeName, function() {
    expect(typeof obj[propName]).toBe(typeName);
  });
}

function waitUntilCalled(callback, opt_timeout) {
  var done = false;
  var ondone = function() {
    done = true;
  };
  var isdone = function() {
    return done;
  };
  var wrapped = function() {
    ondone();
    return callback.apply(this, arguments);
  };
  waitsFor(isdone, opt_timeout);
  return wrapped;
}

function waitUntilCalledAndThenRun(callback, andthen) {
  var ret = waitUntilCalled(callback);
  runs(andthen);
  return ret;
}

function itWaitsForDone(description, callback, opt_timeout) {
  var done = false;
  var ondone = function() {
    done = true;
  };
  var isdone = function() {
    if (!done) {
      return false;
    }
    done = false;
    return true;
  };
  var wrapped = function() {
    waitsFor(isdone, opt_timeout);
    return callback(ondone);
  };
  return it(description, wrapped);
}

function beforeEachWaitsForDone(callback, opt_timeout) {
  var done = false;
  var ondone = function() {
    done = true;
  };
  var isdone = function() {
    if (!done) {
      return false;
    }
    done = false;
    return true;
  };
  var wrapped = function() {
    waitsFor(isdone, opt_timeout);
    done = false;
    return callback(ondone);
  };
  return beforeEach(wrapped);
}
