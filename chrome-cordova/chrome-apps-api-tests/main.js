(function() {

'use strict';

/******************************************************************************/

function getMode(callback) {
  return chrome.storage.local.get({'mode': 'main'}, function(result) {
    console.log(result['mode']);
    callback(result['mode']);
  });
}

function setMode(mode) {
  var handlers = {
    'main': runMain,
    'auto': runAutoTests,
    'manual': runManualTests
  }
  if (!handlers.hasOwnProperty(mode)) {
    return console.error("Unsopported mode: " + mode);
  }

  chrome.storage.local.set({'mode': mode});
  window.clearContent();

  handlers[mode]();
}

/******************************************************************************/

window.clearContent = function() {
  var content = document.getElementById('content');
  content.innerHTML = '';
  var log = document.getElementById('log--content');
  log.innerHTML = '';
  var buttons = document.getElementById('buttons');
  buttons.innerHTML = '';
}

window.setTitle = function(title) {
  var el = document.getElementById('title');
  el.textContent = title;
}

window.createActionButton = function(title, callback) {
  var buttons = document.getElementById('buttons');
  var div = document.createElement('div');
  var button = document.createElement('a');
  button.textContent = title;
  button.onclick = function(e) {
    e.preventDefault();
    callback();
  };
  button.classList.add('topcoat-button');
  div.appendChild(button);
  buttons.appendChild(div);
}

// TODO: make a better logger
window.logger = function() {
  console.log.apply(console, arguments);
  window.medic.log.apply(window.medic.log, arguments);

  var el = document.getElementById('log--content');
  var div = document.createElement('div');
  div.classList.add('log--content--line');
  div.textContent = Array.prototype.slice.apply(arguments).map(function(arg) {
      return (typeof arg === 'string') ? arg : JSON.stringify(arg);
    }).join(' ');
  el.appendChild(div);
  // scroll to bottom
  el.scrollTop = el.scrollHeight;
}

/******************************************************************************/

function runAutoTests() {
  setTitle('Auto Tests');

  createActionButton('Again', setMode.bind(null, 'auto'));
  createActionButton('Reset App', chrome.runtime.reload);
  createActionButton('Back', setMode.bind(null, 'main'));

  var jasmineInterface = window.setUpJasmine();
  // Attach jasmineInterface to global object
  for (var property in jasmineInterface) {
    window[property] = jasmineInterface[property];
  }
  window.defineAutoTests(jasmineInterface);

  // Run the tests!
  var jasmineEnv = jasmine.getEnv();
  jasmineEnv.execute();
}

/******************************************************************************/

function runManualTests() {
  setTitle('Manual Tests');

  createActionButton('Reset App', chrome.runtime.reload);
  createActionButton('Back', setMode.bind(null, 'main'));

  var contentEl = document.getElementById('content');
  var beforeEach = function() {
    window.clearContent();
    createActionButton('Reset App', chrome.runtime.reload);
    createActionButton('Back', setMode.bind(null, 'manual'));
  }
  window.defineManualTests(contentEl, beforeEach, createActionButton);
}

/******************************************************************************/

function runMain() {
  setTitle('Chrome Apps Api Tests');

  createActionButton('Auto Tests', setMode.bind(null, 'auto'));
  createActionButton('Manual Tests', setMode.bind(null, 'manual'));
  createActionButton('Reset App', chrome.runtime.reload);
}

/******************************************************************************/

document.addEventListener("DOMContentLoaded", function() {
  window.medic.load(function() {
    if (window.medic.enabled) {
      setMode('auto');
    } else {
      getMode(setMode);
    }
  });
});

/******************************************************************************/

}());
