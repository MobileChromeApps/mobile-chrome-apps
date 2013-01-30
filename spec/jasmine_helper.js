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

function waitUntilCalled(callback) {
  var done = false;
  var wrapped = function() {
    done = true;
    return callback.apply(this, arguments);
  };
  waitsFor(function() { return done; });
  return wrapped;
}

function waitUntilCalledAndThenRun(callback, andthen) {
  var ret = waitUntilCalled(callback);
  runs(andthen);
  return ret;
}
