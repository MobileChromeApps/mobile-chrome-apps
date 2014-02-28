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

function createWaitsForDoneWrapper(callback, opt_timeout) {
  var done;
  return function() {
    done = false;
    waitsFor(function() { return done; }, opt_timeout);
    return callback(function() { done = true });
  };
}

function waitUntilCalled(callback, opt_timeout) {
  var done = createWaitsForDoneWrapper(function(done) { return done; })();
  var wrapped = function() {
    done();
    return callback.apply(null, arguments);
  };
  return wrapped;
}

function itWaitsForDone(description, callback, opt_timeout) {
  var wrapped = createWaitsForDoneWrapper(callback, opt_timeout);
  return it(description, wrapped);
}

function xitWaitsForDone() {}

function beforeEachWaitsForDone(callback, opt_timeout) {
  var wrapped = createWaitsForDoneWrapper(callback, opt_timeout);
  return beforeEach(wrapped);
}

function afterEachWaitsForDone(callback, opt_timeout) {
  var wrapped = createWaitsForDoneWrapper(callback, opt_timeout);
  return afterEach(wrapped);
}

function isOnCordova() {
  return typeof cordova !== 'undefined';
}

function isOnChromeRuntime() {
  return !isOnCordova();
}

function describeCordovaOnly() {
  if (!isOnCordova()) return;
  describe.apply(null, arguments);
}

function describeChromeRuntimeOnly() {
  if (!isOnChromeRuntime()) return;
  describe.apply(null, arguments);
}
