(function() {

'use strict';

var exports = window;

exports.setUpJasmine = function() {
  // Set up jasmine
  var jasmine = jasmineRequire.core(jasmineRequire);
  jasmineRequire.html(jasmine);
  var jasmineEnv = jasmine.currentEnv_ = new jasmine.Env();

  jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;
  jasmineEnv.catchExceptions(false);

  // Set up jasmine interface
  var jasmineInterface = Object.create(null);
  jasmineInterface.jasmine = jasmine;

  // Fill in jasmineInterface with built-ins
  var jasmine_env_functions = ['describe',
                               'xdescribe',
                               'it',
                               'xit',
                               'beforeEach',
                               'afterEach',
                               'expect',
                               'pending',
                               'spyOn',
                               'addCustomEqualityTester',
                               'addMatchers'];

  jasmine_env_functions.forEach(function(fn) {
    jasmineInterface[fn] = jasmineEnv[fn].bind(jasmineEnv);
  });
  jasmineInterface.clock = jasmineEnv.clock;

  // Extend jasmineInterface with custom helpers
  addJasmineHelpers(jasmineInterface);

  // Add Reporters
  addJasmineReporters(jasmineInterface, jasmineEnv);

  // Add Spec Filter
  jasmineEnv.specFilter = function(spec) {
    //console.log(spec.getFullName());
    return true;
  };

  return jasmineInterface;
}

function addJasmineHelpers(jasmineInterface) {
  jasmineInterface.isOnCordova = function() {
    return typeof window.cordova !== 'undefined';
  };

  jasmineInterface.isOnChromeRuntime = function() {
    return typeof window.chrome.runtime !== 'undefined';
  };

  jasmineInterface.describeChromeOnly = function(){};
  jasmineInterface.describeAndroidOnly = function(){};
  jasmineInterface.describeIosOnly = function(){};
  jasmineInterface.describeExcludeChrome = function(){};
  jasmineInterface.describeExcludeIos = function(){};
  jasmineInterface.describeExcludeAndroid = function(){};

  if (!jasmineInterface.isOnCordova()) {
    jasmineInterface.describeChromeOnly = jasmineInterface.describe;
    jasmineInterface.describeExcludeIos = jasmineInterface.describe;
    jasmineInterface.describeExcludeAndroid = jasmineInterface.describe;
  } else {
    jasmineInterface.describeCordovaOnly = jasmineInterface.describe;

    var platform = cordova.require('cordova/platform');
    if (platform.id == "android") {
      jasmineInterface.describeAndroidOnly = jasmineInterface.describe;
      jasmineInterface.describeExcludeIos = jasmineInterface.describe;
    } else if (platform.id == "ios") {
      jasmineInterface.describeIosOnly = jasmineInterface.describe;
      jasmineInterface.describeExcludeAndroid = jasmineInterface.describe;
    }
  }

  jasmineInterface.itShouldHaveAnEvent = function(obj, eventName) {
    jasmineInterface.it('should have an event called ' + eventName, function() {
      jasmineInterface.expect(obj[eventName]).toEqual(jasmineInterface.jasmine.any(chrome.Event));
    });
  }

  jasmineInterface.itShouldHaveAPropertyOfType = function(obj, propName, typeName) {
    jasmineInterface.it('should have a "' + propName + '" ' + typeName, function() {
      jasmineInterface.expect(typeof obj[propName]).toBe(typeName);
    });
  }
}

function addJasmineReporters(jasmineInterface, jasmineEnv) {
  jasmineInterface.jsApiReporter = new jasmineInterface.jasmine.JsApiReporter({ timer: new jasmineInterface.jasmine.Timer() });
  jasmineEnv.addReporter(jasmineInterface.jsApiReporter);

  jasmineInterface.htmlReporter = new jasmineInterface.jasmine.HtmlReporter({
    env: jasmineEnv,
    queryString: function() { return null; },
    onRaiseExceptionsClick: function() { },
    getContainer: function() { return document.getElementById('content'); },
    createElement: function() { return document.createElement.apply(document, arguments); },
    createTextNode: function() { return document.createTextNode.apply(document, arguments); },
    timer: new jasmineInterface.jasmine.Timer()
  });
  jasmineInterface.htmlReporter.initialize();
  jasmineEnv.addReporter(jasmineInterface.htmlReporter);

  if (window.medic.enabled) {
    jasmineRequire.medic(jasmineInterface.jasmine);
    jasmineInterface.MedicReporter = new jasmineInterface.jasmine.MedicReporter({
      env: jasmineEnv,
      log: { logurl: window.medic.logurl }
    });
    jasmineInterface.MedicReporter.initialize();
    jasmineEnv.addReporter(jasmineInterface.MedicReporter);
  }
}

}());
