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
  var bufferedLogs = [];

  function log(text) {
    var logElem = chromespec.fgDoc && chromespec.fgDoc.querySelector('#logs');
    if (logElem) {
      // Empty out buffered logs.
      if (bufferedLogs) {
        var logs = bufferedLogs;
        bufferedLogs = [];
        for (var i = 0; i < logs.length; ++i) {
          log(logs[i]);
        }
      }
      var newPre = chromespec.fgDoc.createElement('pre');
      newPre.textContent = text;
      logElem.appendChild(newPre);
    } else {
      bufferedLogs.push(text);
    }
    console.log('[ChromeSpec log] ' + text);
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

  function createDropdown(text, id, values) {
    var container = chromespec.fgDoc.createElement('div');

    // Create the title label.
    container.appendChild(document.createTextNode(text));

    // Create the dropdown.
    var dropdown = chromespec.fgDoc.createElement('select');
    dropdown.id = id;
    for (var value in values) {
      var option = chromespec.fgDoc.createElement('option');
      option.value = values[value];
      option.textContent = value;
      dropdown.appendChild(option);
    }
    container.appendChild(dropdown);

    return container;
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
          'third_party/jasmine-1.3.1/jasmine.js',
          'third_party/jasmine-1.3.1/jasmine-html.js',
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
      log('Foreground URL = ' + wnd.location.href);
      wnd.onload = onUiWindowLoad;
      wnd.jasmine = window.jasmine;
      wnd.chromespec = chromespec;
      if (typeof onLoadCallback == 'function') {
        onLoadCallback(w);
      }
    });
  }

  function onUiWindowLoad() {
    injectStyle('third_party/jasmine-1.3.1/jasmine.css');
    injectStyle('spec_styles.css');
    // Inject jasmine.js again so that it will register it's global helper functions (e.g. it, describe).
    var scripts = [
        'third_party/jasmine-1.2.0/jasmine.js',
        'jasmine_helper.js'
    ];
    injectScripts(chromespec.fgDoc, scripts, onScriptsLoaded);
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
      changePage(values && values['chromespec-page'] || 0);
    });
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

  log('App started. ID = ' + chrome.runtime.id);
  log('Background URL = ' + location.href);
  chrome.app.runtime.onLaunched.addListener(startUpLogic);

  chromespec.changePage = changePage;
  chromespec.createButton = createButton;
  chromespec.createDropdown = createDropdown;
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

