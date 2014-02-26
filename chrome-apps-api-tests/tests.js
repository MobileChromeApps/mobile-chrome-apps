(function() {

'use strict';

var exports = window;

exports.tests = Object.create(null);

function getTestsObject(api) {
  return window.tests[api] = window.tests[api] || { enabled: true };
}

// Usage:
// registerAutoTests('apiName', function() {
//   define('foo', function() {
//     .. jasmine tests ..
//   });
// });
exports.registerAutoTests = function(api, fn) {
  var apiTests = getTestsObject(api);
  apiTests.defineAutoTests = function(jasmineInterface) {
    jasmineInterface.describe(api + ' >>', fn);
  };
};

// Usage:
// registerManualTests('apiName', function(contentEl, addButton) {
//   .. setup ..
//   addButton('Test Description', function() { ... });
//   addButton('Test 2', function() { ... });
// });
exports.registerManualTests = function(api, fn) {
  var apiTests = getTestsObject(api);
  apiTests.defineManualTests = function(contentEl, addButton) {
    fn(contentEl, addButton);
  };
}

}());
