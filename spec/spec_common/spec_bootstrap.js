var wnd = null;
var doc = null;

(function() {
  var jasmineLoaded = false;
  var uiSyncReporter = null;
  var specScriptsLoadCount = 0;

  window.log = function log(text) {
    var logElem = doc.querySelector('#logs');
    var newPre = doc.createElement('pre');
    newPre.textContent = text;
    logElem.appendChild(newPre);
    console.log(text);
  };

  window.addActionButton = function addActionButton(name, func) {
    var btnsElem = doc.querySelector('#btns');
    var newButton = doc.createElement('div');
    newButton.textContent = name;
    newButton.className = 'btn';
    newButton.onclick = func;
    newButton.tabIndex = 1;
    btnsElem.appendChild(newButton);
  };

  window.injectScript = function injectScript(doc_, src, callback) {
    console.log('injecting script into ' + (doc_ == doc ? 'fg' : 'bg') + ': ' + src);
    var n = doc_.createElement('script');
    n.onload = callback;
    n.src = src;
    var head = doc_.querySelector('head');
    head.appendChild(n);
  };

  // Loads scripts in sequence.
  window.injectScripts = function injectScripts(doc, srcs, callback) {
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
  };

  function injectStyle(src) {
    var n = doc.createElement('link');
    n.setAttribute('rel', 'stylesheet');
    n.setAttribute('href', src);
    doc.querySelector('head').appendChild(n);
  }

  function UiSyncReporter() {
    this.fgElem = null;
    this.intervalId = 0;
  }

  UiSyncReporter.prototype.reportRunnerStarting = function(runner) {
    window.clearInterval(this.intervalId);
    this.intervalId = window.setInterval(this.sync.bind(this), 200);
  };

  UiSyncReporter.prototype.sync = function() {
    this.fgElem = this.fgElem || doc && doc.getElementById('jasmine-container');
    var bgElems = document.getElementsByClassName('jasmine_reporter');
    if (this.fgElem) {
      var newHtml = '';
      for (var i = 0, bgElem; bgElem = bgElems[i]; ++i) {
        newHtml += bgElem.outerHTML;
      }
      this.fgElem.innerHTML = newHtml;
    }
  };

  UiSyncReporter.prototype.reportRunnerResults = function(runner) {
    window.clearInterval(this.intervalId);
    this.sync();
    this.intervalId = 0;
  };

  function initJasmine(callback) {
    function afterJasmineLoaded() {
      // Make sure both pages use the same jasmine context.
      if (wnd) {
        wnd.jasmine = jasmine;
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
      injectScripts(document, scripts, function() {
        var jasmineEnv = jasmine.getEnv();
        jasmineEnv.updateInterval = 1000;
        var htmlReporter = new jasmine.HtmlReporter();
        htmlReporter.logRunningSpecs = true;
        jasmineEnv.addReporter(htmlReporter);
        uiSyncReporter = new UiSyncReporter();
        jasmineEnv.addReporter(uiSyncReporter);
        afterJasmineLoaded();
      });
    } else {
      afterJasmineLoaded();
    }
  }

  function runJasmine(finishCallback) {
    var jasmineEnv = jasmine.getEnv();
    if (finishCallback) {
      var doneReporter = new jasmine.Reporter();
      doneReporter.reportRunnerResults = function() {
        delete doneReporter.reportRunnerResults;
        finishCallback();
      };
      jasmineEnv.addReporter(doneReporter);
    }
    jasmineEnv.execute();
  }

  function maybeRunSpecScripts() {
    if (++specScriptsLoadCount == 2) {
      runJasmine();
    }
  }

  function injectJasmineScripts(doc_, scriptSrcs, callback) {
    initJasmine(function() {
      injectScripts(doc_, scriptSrcs, callback);
    });
  }

  window.createUiWindow = function createUiWindow(onLoadCallback) {
    chrome.app.window.create('wnd.html', {
      width: 320,
      height: 380,
      id: 'ui'
    }, function(w) {
      console.log('UI window init start.');
      wnd = w.contentWindow;
      doc = wnd.document;
      wnd.onload = onUiWindowLoad;
      wnd.jasmine = window.jasmine;
      if (typeof onLoadCallback == 'function') {
        onLoadCallback(w);
      }
    });
  };

  function onUiWindowLoad() {
    injectStyle('spec_common/jasmine/jasmine.css');
    injectStyle('spec_common/spec_styles.css');
    var scripts = [
        'spec_common/jasmine/jasmine.js',
        'spec_common/jasmine_helper.js'
    ];
    injectScripts(doc, scripts, onScriptsLoaded);
  }

  function ensureCordovaInitializes() {
    var timerId = window.setTimeout(function() {
      log('Cordova failed to initialize.');
    }, 500);
    doc.addEventListener('deviceready', function() {
      window.clearTimeout(timerId);
      log('Cordova initialized. platform: ' + wnd.device.platform);
    }, false);
  }

  function onScriptsLoaded() {
    doc.body.insertAdjacentHTML('beforeend', '<h1></h1>' +
        '<h2>Jasmine Tests</h2><div id="jasmine-container"></div>' +
        '<h2>Manual Actions</h2><div id=btns></div>' +
        '<div class="btn back-btn" tabindex=1>Back</div><h2>Logs</h2><div id=logs></div>');
    doc.querySelector('h1').textContent = chrome.runtime.getManifest().name;
    doc.querySelector('.back-btn').onclick = backHome;
    uiSyncReporter && uiSyncReporter.sync();
    ensureCordovaInitializes();
    // This function is defined in app's background.js.
    window.initPage && initPage();
    if (window.specScripts) {
      injectJasmineScripts(doc, specScripts, maybeRunSpecScripts);
    }
    console.log('UI window init complete.');
  }

  function backHome() {
    wnd.location = '../chromeapp.html';
  }

  function startUpLogic() {
    console.log('onLaunched called.');
    if (!window.noAutoCreateWindow) {
      createUiWindow();
    }
  }
  console.log('App started.');
  window.onload = function() {
    if (window.specScripts) {
      injectJasmineScripts(document, specScripts, maybeRunSpecScripts);
    }
  };
  chrome.app.runtime.onLaunched.addListener(startUpLogic);
})();
