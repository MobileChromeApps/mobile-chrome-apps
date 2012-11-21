var wnd = null;
var doc = null;

function log(text) {
  var logElem = doc.querySelector('#logs');
  var newPre = doc.createElement('pre');
  newPre.textContent = text;
  logElem.appendChild(newPre);
  console.log(text);
}

function addActionButton(name, func) {
  var btnsElem = doc.querySelector('#btns');
  var newButton = doc.createElement('div');
  newButton.textContent = name;
  newButton.className = 'btn';
  newButton.onclick = func;
  newButton.tabIndex = 1;
  btnsElem.appendChild(newButton);
}

function runJasmine() {
  var jasmineEnv = jasmine.getEnv();
  jasmineEnv.updateInterval = 1000;

  var htmlReporter = new jasmine.HtmlReporter(doc);

  jasmineEnv.addReporter(htmlReporter);

  jasmineEnv.specFilter = function(spec) {
    return htmlReporter.specFilter(spec);
  };

  jasmineEnv.execute();
}

(function() {
  chrome.app.runtime.onLaunched.addListener(function() {
    chrome.app.window.create('wnd.html', {
      width: 320,
      height: 380
    }, function(w) {
      wnd = w.contentWindow;
      doc = wnd.document;
      wnd.onload = onLoad;
    });
  });

  function onLoad() {
    injectStyle('spec_common/spec_styles.css');
    injectStyle('spec_common/jasmine/jasmine-html.js');
    // Must be loaded in serial.
    injectScript('spec_common/jasmine/jasmine.js', function() {
      injectScript('spec_common/jasmine/jasmine-html.js', onScriptsLoaded);
    });
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
    doc.body.insertAdjacentHTML('beforeend', '<h1></h1><h2>Manual Actions</h2><div id=btns></div>' +
        '<div class="btn back-btn" tabindex=1>Back</div><h2>Logs</h2><div id=logs></div>');
    doc.querySelector('h1').textContent = chrome.runtime.getManifest().name;
    doc.querySelector('.back-btn').onclick = backHome;
    ensureCordovaInitializes();
    initPage();
  }

  function injectScript(src, onLoadCallback) {
    var n = doc.createElement('script');
    n.onload = onLoadCallback;
    n.src = src;
    doc.querySelector('head').appendChild(n);
  }

  function injectStyle(src) {
    var n = doc.createElement('link');
    n.setAttribute('rel', 'stylesheet');
    n.setAttribute('href', src);
    doc.querySelector('head').appendChild(n);
  }

  function backHome() {
    wnd.location = '../chromeapp.html';
  }
})();

