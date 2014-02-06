(function() {

'use strict';

var exports = window;

exports.tests = Object.create(null);

function getTestsObject(api) {
  return window.tests[api] = window.tests[api] || {};
}

exports.registerAutoTests = function(api, fn) {
  getTestsObject(api).defineAutoTests = function(jasmineInterface) {
    jasmineInterface.describe(api + ' >>', fn);
  };
  getTestsObject(api).enabled = true;
};

exports.registerManualTest = function(api, name, fn) {
  //getTestsObject(api).
}

}());
