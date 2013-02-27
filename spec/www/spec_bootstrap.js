// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromespec = {};
chromespec.fgWnd = null;
chromespec.fgDoc = null;
chromespec.bgWnd = window;
chromespec.bgDoc = document;
chromespec.subPages = [];
chromespec.jasmineScripts = {};

// A flag for jasmine_helper.js.
window.runningInBg = true;

(function() {
  var jasmineLoaded = false;

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
    chromespec.jasmineScripts[testName] = {
      name: testName,
      jsFile: 'test.' + testName + '.js',
      bgInstance: null,
      fgInstance: null
    };
  }

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
          'jasmine/jasmine.js',
          'jasmine/jasmine-html.js',
          'jasmine_helper.js'
          ];
      injectScripts(document, scripts, afterJasmineLoaded);
    } else {
      afterJasmineLoaded();
    }
  }

  function registerSubPage(name, func) {
    chromespec.subPages.push({
      name: name,
      initFunc: func
    });
  }

  function registerJasmineTestInstance(runningInBg, name, func) {
    chromespec.jasmineScripts[name][runningInBg ? 'bgInstance' : 'fgInstance'] = func;
  }

  function injectStyle(src) {
    var n = chromespec.fgDoc.createElement('link');
    n.setAttribute('rel', 'stylesheet');
    n.setAttribute('href', src);
    chromespec.fgDoc.querySelector('head').appendChild(n);
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
    injectStyle('jasmine/jasmine.css');
    injectStyle('spec_styles.css');
    // Inject jasmine.js again so that it will register it's global helper functions (e.g. it, describe).
    var scripts = [
        'jasmine/jasmine.js',
        'jasmine_helper.js'
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

  function onScriptsLoaded() {
    var homeButton = chromespec.createButton('Home', changePage.bind(null, 0));
    homeButton.classList.add('home-btn');
    chromespec.fgDoc.body.appendChild(homeButton);
    chromespec.fgDoc.body.insertAdjacentHTML('beforeend', '<h1 id="page-title"></h1>' +
        '<div id="page-container"></div>' +
        '<h2>Logs<a href="javascript:;" class="clear-logs">clear</span></h2><div id=logs></div>');

    chromespec.fgDoc.querySelector('.clear-logs').onclick = clearLogs;

    chrome.storage.local.get('chromespec-page', function(values) {
      changePage(values['chromespec-page'] || 0);
    });
    ensureCordovaInitializes();
  }

  function changePage(pageIndex) {
    chrome.storage.local.set({'chromespec-page': pageIndex});
    clearLogs();
    var page = chromespec.subPages[pageIndex];
    var doc = chromespec.fgDoc;
    var pageContainerEl = doc.getElementById('page-container');
    doc.getElementById('page-title').textContent = page.name;
    pageContainerEl.innerHTML = '';
    page.initFunc(pageContainerEl);
  }

  function startUpLogic() {
    log('onLaunched called.');
    if (!window.noAutoCreateWindow) {
      createUiWindow();
    }
  }

  log('App started.');
  chrome.app.runtime.onLaunched.addListener(startUpLogic);

  chromespec.changePage = changePage;
  chromespec.createButton = createButton;
  chromespec.createUiWindow = createUiWindow;
  chromespec.log = log;
  chromespec.initJasmine = initJasmine;
  chromespec.injectScript = injectScript;
  chromespec.injectScripts = injectScripts;
  chromespec.injectStyle = injectStyle;
  chromespec.registerJasmineTest = registerJasmineTest;
  chromespec.registerJasmineTestInstance = registerJasmineTestInstance;
  chromespec.registerSubPage = registerSubPage;
})();
