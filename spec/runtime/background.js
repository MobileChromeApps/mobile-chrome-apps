/**
 * Listens for the app launching then creates the window.
 * Ignores the provided window size.
 *
 * @see http://developer.chrome.com/trunk/apps/app.window.html
 */

var wnd = null;
var doc = null;

chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('index.html', {
    width: 320,
    height: 380,
  }, function(w) {
    wnd = w.contentWindow;
    doc = wnd.document;
    wnd.onload = onLoad;
  });
});

function onLoad() {
  addButtonClickListeners();
}

function addButtonClickListeners() {
  var buttons = doc.getElementsByClassName('btn');
  for (var i = 0, btn; btn = buttons[i]; ++i) {
    btn.onclick = window[btn.id];
  }
}

// Check that chrome.app.runtime.onLaunched exists.
function checkOnLaunched() {
  doc.getElementById('status').innerHTML = chrome.app.runtime.onLaunched ? "onLaunched exists" : "onLaunched not found";
};

// Check that chrome.app.runtime.onSuspend exists.
function checkOnSuspend() {
  doc.getElementById('status').innerHTML = chrome.runtime.onSuspend ? "onSuspend exists" : "onSuspend not found";
};

// Attach a handler to onSuspend that will populate the status field when it gets called.
function attachOnSuspend() {
  var buttonTime = new Date();
  chrome.runtime.onSuspend.addListener(function() {
    var callbackTime = new Date();
    doc.getElementById('status').innerHTML = 'onSuspend fired: ' + (callbackTime.getTime() - buttonTime.getTime()) + 'ms after button';
  });
}

function backHome() {
  wnd.location = '../chromeapp.html';
}

