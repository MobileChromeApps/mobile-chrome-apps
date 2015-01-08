(function() {

'use strict';

var exports = window;

exports.setUpJasmine = function() {
  var jasmine = jasmineRequire.core(jasmineRequire);
  jasmineRequire.html(jasmine);
  var env = jasmine.getEnv();

  var jasmineInterface = jasmineRequire.interface(jasmine, env);
  jasmineInterface.jasmine = jasmine;
  addJasmineHelpers(jasmineInterface);

  var queryString = new jasmine.QueryString({
    getWindowLocation: function() { return window.location; }
  });

  var catchingExceptions = queryString.getParam("catch");
  env.catchExceptions(typeof catchingExceptions === "undefined" ? true : catchingExceptions);

  var specFilter = new jasmine.HtmlSpecFilter({
    filterString: function() { return queryString.getParam("spec"); }
  });
  env.specFilter = function(spec) {
    return specFilter.matches(spec.getFullName());
  };

  var htmlReporter = new jasmine.HtmlReporter({
    env: env,
    onRaiseExceptionsClick: function() { queryString.setParam("catch", !env.catchingExceptions()); },
    getContainer: function() { return document.getElementById('content'); },
    createElement: function() { return document.createElement.apply(document, arguments); },
    createTextNode: function() { return document.createTextNode.apply(document, arguments); },
    timer: new jasmine.Timer()
  });
  htmlReporter.initialize()

  env.addReporter(jasmineInterface.jsApiReporter);
  env.addReporter(htmlReporter);

  addJasmineReporters(jasmineInterface, env);

  /**
   * Setting up timing functions to be able to be overridden. Certain browsers (Safari, IE 8, phantomjs) require this hack.
   */
  window.setTimeout = window.setTimeout;
  window.setInterval = window.setInterval;
  window.clearTimeout = window.clearTimeout;
  window.clearInterval = window.clearInterval;

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
    jasmineInterface.describeExcludeChrome = jasmineInterface.describe;

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
