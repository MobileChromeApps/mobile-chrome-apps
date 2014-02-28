// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(function() {
  var jasmineContainerEl = null;
  var uiSyncReporter = null;

  // The purpose of this is to mirror the jasmine HTML from the
  // background page onto the foreground page.
  function UiSyncReporter() {
    this.bgElem = null;
    this.fgElem = jasmineContainerEl;
    this.intervalId = 0;
  }

  UiSyncReporter.prototype.reportRunnerStarting = function(runner) {
    window.clearInterval(this.intervalId);
    this.intervalId = window.setInterval(this.sync.bind(this), 200);
  };

  UiSyncReporter.prototype.sync = function() {
    this.bgElem = this.bgElem || document.getElementById('HTMLReporter');
    if (this.fgElem && this.bgElem) {
      this.fgElem.innerHTML = this.bgElem.outerHTML;
    }
  };

  UiSyncReporter.prototype.stop = function() {
    window.clearInterval(this.intervalId);
    this.intervalId = 0;
    this.sync();
    // Remove the reporter node in case the tests are run again.
    if (this.bgElem) {
      this.bgElem.parentNode.removeChild(this.bgElem);
      this.bgElem = null;
    }
  };

  UiSyncReporter.prototype.reportRunnerResults = function(runner) {
    this.stop();
  };

  function resetJasmine(finishCallback) {
    jasmine.currentEnv_ = new jasmine.Env();
    var jasmineEnv = jasmine.getEnv();
    jasmineEnv.updateInterval = 1000;
    jasmineEnv.defaultTimeoutInterval = 300;

    var htmlReporter = new jasmine.HtmlReporter();
    // TODO(agrieve): Make this spec filter work without a page reload.
    var specQueryParam = parent.location.search.split('=')[1];
    specQueryParam = specQueryParam && decodeURIComponent(specQueryParam);
    jasmineEnv.specFilter = function(spec) {
      return !specQueryParam || spec.getFullName() == specQueryParam;
    };
    htmlReporter.logRunningSpecs = true;
    jasmineEnv.addReporter(htmlReporter);

    uiSyncReporter && uiSyncReporter.stop();
    uiSyncReporter = new UiSyncReporter();
    jasmineEnv.addReporter(uiSyncReporter);

    if (finishCallback) {
      var doneReporter = {};
      doneReporter.reportRunnerResults = finishCallback;
      jasmineEnv.addReporter(doneReporter);
    }
  }

  function loadJasmineTest(testName, runInBg) {
    var pageName = runInBg ? 'bg' : 'fg';
    describe(testName + ' (In ' + pageName + '):', function() {
      chromespec.jasmineScripts[testName][pageName + 'Instance'].call(this, runInBg);
    });
  }

  function onRunJasmineClick(specName) {
    chrome.storage.local.set({'chromespec-jasmine-last-test': specName});
    var runInFg = rootDiv.querySelector('#jasmine-run-in-fg').checked;
    var runInBg = rootDiv.querySelector('#jasmine-run-in-bg').checked;
    var countDown = 0;
    function afterInject(name, runInBg) {
      loadJasmineTest(name, runInBg);
      if (--countDown === 0) {
        jasmine.getEnv().execute();
      }
    }
    function injectAndLoad(name) {
      var scriptPath = chromespec.jasmineScripts[name].jsFile;
      if (runInFg) {
        ++countDown;
        chromespec.injectScript(chromespec.fgDoc, scriptPath, afterInject.bind(null, name, false));
      }
      if (runInBg) {
        ++countDown;
        chromespec.injectScript(chromespec.bgDoc, scriptPath, afterInject.bind(null, name, true));
      }
    }
    chromespec.initJasmine(function() {
      resetJasmine();
      if (!specName) {
        for (var k in chromespec.jasmineScripts) {
          injectAndLoad(k);
        }
      } else {
        injectAndLoad(specName);
      }
    });
  }


  chromespec.registerSubPage('Jasmine Tests', function(_rootDiv) {
    rootDiv = _rootDiv;
    rootDiv.innerHTML =
        '<div>Run in:<label><input type=checkbox id="jasmine-run-in-fg" checked>FG</label>' +
        '<label><input type=checkbox id="jasmine-run-in-bg" checked>BG</label></div>' +
        '<div id="jasmine-ui"></div>' +
        '<div id="jasmine-container"></div>';
    jasmineContainerEl = rootDiv.querySelector('#jasmine-container');
    var containerEl = rootDiv.querySelector('#jasmine-ui');

    var newButton = chromespec.createButton('Run All', onRunJasmineClick.bind(null, ''));
    containerEl.appendChild(newButton);
    for (var k in chromespec.jasmineScripts) {
      newButton = chromespec.createButton(chromespec.jasmineScripts[k].name, onRunJasmineClick.bind(null, k));
      containerEl.appendChild(newButton);
    }
    // Auto-run most recent test on start-up.
    chrome.storage.local.get('chromespec-jasmine-last-test', function(values) {
      var testName = values['chromespec-jasmine-last-test'];
      if (testName) {
        onRunJasmineClick(testName);
      }
    });
  });
})();
