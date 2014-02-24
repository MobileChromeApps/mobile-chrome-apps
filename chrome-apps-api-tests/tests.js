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
// registerManualTests('apiName', {
//   'Test Description': function(contentEl) { ... },
//   'Test 2': function(contentEl) { ..  },
// });
exports.registerManualTests = function(api, tests) {
  var apiTests = getTestsObject(api);
  apiTests.defineManualTests = function(defineManualTest) {
    Object.keys(tests).forEach(function(testName) {
      defineManualTest(testName, tests[testName]);
    });
  };
}

}());
