chromespec = {};
chromespec.fgWnd = null;
chromespec.fgDoc = null;
chromespec.bgWnd = window;

// A flag for jasmine_helper.js.
window.runningInBg = true;

(function() {
  var jasmineLoaded = false;
  var jasmineScripts = {};
  var uiSyncReporter = null;


  function log(text) {
    if (chromespec.fgDoc) {
      var logElem = chromespec.fgDoc.querySelector('#logs');
      if (logElem) {
        var newPre = chromespec.fgDoc.createElement('pre');
        newPre.textContent = text;
        logElem.appendChild(newPre);
      }
    }
    console.log(text);
  }

  function clearLogs() {
    var logElem = chromespec.fgDoc.querySelector('#logs');
    logElem.innerHTML = '';
  }

  function createButton(name, func) {
    var newButton = chromespec.fgDoc.createElement('div');
    newButton.textContent = name;
    newButton.className = 'btn';
    newButton.onclick = func;
    newButton.tabIndex = 1;
    return newButton;
  }

  function addActionButton(name, func) {
    var btnsElem = chromespec.fgDoc.querySelector('#btns');
    var newButton = createButton(name, func);
    btnsElem.appendChild(newButton);
  }

  function injectScript(doc, src, callback) {
    log('injecting script into ' + (doc == chromespec.fgDoc ? 'fg' : 'bg') + ': ' + src);
    var n = doc.createElement('script');
    n.onload = callback;
    n.src = src;
    var head = doc.querySelector('head');
    head.appendChild(n);
  }

  // Loads scripts in sequence.
  function injectScripts(doc, srcs, callback) {
    srcs = srcs.concat();
    function helper() {
      var src = srcs.shift();
      if (src) {
        injectScript(doc, src, helper);
      } else {
        callback && callback();
      }
    }
    helper();
  }

  function registerJasmineTest(testName) {
    jasmineScripts[testName] = {
      name: testName,
      jsFile: 'test.' + testName + '.js',
      bgInstance: null,
      fgInstance: null
    };
  }

  function registerJasmineTestInstance(runningInBg, name, func) {
    jasmineScripts[name][runningInBg ? 'bgInstance' : 'fgInstance'] = func;
  }

  function injectStyle(src) {
    var n = chromespec.fgDoc.createElement('link');
    n.setAttribute('rel', 'stylesheet');
    n.setAttribute('href', src);
    chromespec.fgDoc.querySelector('head').appendChild(n);
  }

  // The purpose of this is to mirror the jasmine HTML from the
  // background page onto the foreground page.
  function UiSyncReporter() {
    this.bgElem = null;
    this.fgElem = null;
    this.intervalId = 0;
  }

  UiSyncReporter.prototype.reportRunnerStarting = function(runner) {
    window.clearInterval(this.intervalId);
    this.intervalId = window.setInterval(this.sync.bind(this), 200);
  };

  UiSyncReporter.prototype.sync = function() {
    this.fgElem = this.fgElem || chromespec.fgDoc && chromespec.fgDoc.getElementById('jasmine-container');
    this.bgElem = this.bgElem || document.getElementById('HTMLReporter');
    if (this.fgElem && this.bgElem) {
      this.fgElem.innerHTML = this.bgElem.outerHTML;
    }
  };

  UiSyncReporter.prototype.reportRunnerResults = function(runner) {
    window.clearInterval(this.intervalId);
    this.sync();
    this.intervalId = 0;
    // Remove the reporter node in case the tests are run again.
    this.bgElem.parentNode.removeChild(this.bgElem);
    this.bgElem = null;
  };

  function initJasmine(callback) {
    function afterJasmineLoaded() {
      // Make sure both pages use the same jasmine context.
      if (chromespec.fgWnd) {
        chromespec.fgWnd.jasmine = window.jasmine;
      }
      callback();
    }
    if (!jasmineLoaded) {
      jasmineLoaded = true;
      var scripts = [
          'spec_common/jasmine/jasmine.js',
          'spec_common/jasmine/jasmine-html.js',
          'spec_common/jasmine_helper.js'
          ];
      injectScripts(document, scripts, afterJasmineLoaded);
    } else {
      afterJasmineLoaded();
    }
  }

  function resetJasmineRunner(runner) {
    function resetQueue(queue) {
      queue.index = 0;
      queue.abort = false;
    }

    // Reset the results in case this is not the first run.
    var specs = runner.specs();
    for (var i = 0, spec; spec = specs[i]; ++i) {
      jasmine.NestedResults.call(spec.results());
      resetQueue(spec.queue);
    }
    var suites = runner.suites();
    for (var j = 0, suite; suite = suites[j]; ++j) {
      resetQueue(suite.queue);
    }
    resetQueue(runner.queue);
  }

  function resetJasmine(finishCallback) {
    jasmine.currentEnv_ = new jasmine.Env();
    var jasmineEnv = jasmine.getEnv();
    jasmineEnv.updateInterval = 1000;
    jasmineEnv.defaultTimeoutInterval = 300;
    // resetJasmineRunner(jasmineEnv.currentRunner());

    // jasmineEnv.reporter = new jasmine.MultiReporter();
    var htmlReporter = new jasmine.HtmlReporter();
    // TODO(agrieve): Make this spec filter work without a page reload.
    var specQueryParam = parent.location.search.split('=')[1];
    specQueryParam = specQueryParam && decodeURIComponent(specQueryParam);
    jasmineEnv.specFilter = function(spec) {
      return !specQueryParam || spec.getFullName() == specQueryParam;
    };
    htmlReporter.logRunningSpecs = true;
    jasmineEnv.addReporter(htmlReporter);

    uiSyncReporter = new UiSyncReporter();
    jasmineEnv.addReporter(uiSyncReporter);

    if (finishCallback) {
      var doneReporter = {};
      doneReporter.reportRunnerResults = finishCallback;
      jasmineEnv.addReporter(doneReporter);
    }
  }

  function loadJasmineTest(testName, runInFg, runInBg) {
    if (runInBg) {
      describe(testName + ' (In bg):', function() {
        jasmineScripts[testName].bgInstance(true);
      });
    }
    if (runInFg) {
      describe(testName + ' (In fg):', function() {
        jasmineScripts[testName].fgInstance(false);
      });
    }
  }

  function injectSpecScripts(doc, callback) {
    var scriptSrcs = [];
    for (var k in jasmineScripts) {
      scriptSrcs.push(jasmineScripts[k].jsFile);
    }
    initJasmine(function() {
      injectScripts(doc, scriptSrcs, callback);
    });
  }

  function createUiWindow(onLoadCallback) {
    chrome.app.window.create('wnd.html', {
      width: 320,
      height: 380,
      id: 'ui'
    }, function(w) {
      log('UI window init start.');
      var wnd = w.contentWindow;
      chromespec.fgWnd = wnd;
      chromespec.fgDoc = wnd.document;
      wnd.onload = onUiWindowLoad;
      wnd.jasmine = window.jasmine;
      wnd.chromespec = chromespec;
      if (typeof onLoadCallback == 'function') {
        onLoadCallback(w);
      }
    });
  }

  function onUiWindowLoad() {
    injectStyle('spec_common/jasmine/jasmine.css');
    injectStyle('spec_common/spec_styles.css');
    // Inject jasmine.js again so that it will register it's global helper functions (e.g. it, describe).
    var scripts = [
        'spec_common/jasmine/jasmine.js',
        'spec_common/jasmine_helper.js'
    ];
    injectScripts(chromespec.fgDoc, scripts, onScriptsLoaded);
  }

  function ensureCordovaInitializes() {
    var timerId = window.setTimeout(function() {
      log('Cordova failed to initialize.');
    }, 500);
    chromespec.fgDoc.addEventListener('deviceready', function() {
      window.clearTimeout(timerId);
      log('Cordova initialized. platform: ' + chromespec.fgWnd.device.platform);
    }, false);
  }

  function onRunJasmineClick() {
    var runInFg = chromespec.fgDoc.getElementById('jasmine-run-in-fg').checked;
    var runInBg = chromespec.fgDoc.getElementById('jasmine-run-in-bg').checked;
    var specName = this.textContent;
    resetJasmine();
    if (specName == 'Run All') {
      for (var k in jasmineScripts) {
        loadJasmineTest(k, runInFg, runInBg);
      }
    } else {
      loadJasmineTest(specName, runInFg, runInBg);
    }
    jasmine.getEnv().execute();
  }

  function createJasmineUi() {
    var container = chromespec.fgDoc.getElementById('jasmine-ui');
    container.innerHTML =
        '<div>Run in:<label><input type=checkbox id="jasmine-run-in-fg" checked>FG</label>' +
        '<label><input type=checkbox id="jasmine-run-in-bg" checked>BG</label></div>';
    var newButton = createButton('Run All', onRunJasmineClick);
    container.appendChild(newButton);
    for (var k in jasmineScripts) {
      newButton = createButton(jasmineScripts[k].name, onRunJasmineClick);
      container.appendChild(newButton);
    }
  }

  function onScriptsLoaded() {
    chromespec.fgDoc.body.insertAdjacentHTML('beforeend', '<h1></h1>' +
        '<h2>Jasmine Tests</h2><div id="jasmine-ui"></div><div id="jasmine-container"></div>' +
        '<h2>Manual Actions</h2><div id=btns></div>' +
        '<h2>Logs<a href="javascript:;" class="clear-logs">clear</span></h2><div id=logs></div>');
    chromespec.fgDoc.querySelector('h1').textContent = chrome.runtime.getManifest().name;
    chromespec.fgDoc.querySelector('.clear-logs').onclick = clearLogs;
    uiSyncReporter && uiSyncReporter.sync();
    ensureCordovaInitializes();
    // This function is defined in app's background.js.
    window.initPage && initPage();

    var cnt = 0;
    function next() {
      if (++cnt > 1) {
        createJasmineUi();
      }
    }
    initJasmine(function() {
      injectSpecScripts(chromespec.fgDoc, function() {
        log('UI window load complete.');
        next();
      });
      injectSpecScripts(document, function() {
        log('bgWindow load complete');
        next();
      });
    });
  }

  function startUpLogic() {
    log('onLaunched called.');
    if (!window.noAutoCreateWindow) {
      createUiWindow();
    }
  }

  log('App started.');
  chrome.app.runtime.onLaunched.addListener(startUpLogic);

  chromespec.addActionButton = addActionButton;
  chromespec.createUiWindow = createUiWindow;
  chromespec.log = log;
  chromespec.registerJasmineTest = registerJasmineTest;
  chromespec.registerJasmineTestInstance = registerJasmineTestInstance;
})();
