(function() {

'use strict';

var exports = window.medic = {};

exports.logurl = 'http://127.0.0.1:7800';

exports.enabled = false;

exports.log = function() {
  if (!window.medic.enabled)
    return;
  var xhr = new XMLHttpRequest();
  xhr.open("POST", exports.logurl, true);
  xhr.setRequestHeader("Content-Type", "text/plain");
  xhr.send(Array.prototype.slice.apply(arguments));
};

exports.load = function (callback) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "medic.json", true);
  xhr.onload = function() {
    if (xhr.readyState == 4 && xhr.status == 200) {
      var cfg = JSON.parse(xhr.responseText);
      exports.logurl = cfg.logurl;
      exports.enabled = true;
      console.log('Loaded Medic Config: logurl=' + exports.logurl);
    }
    callback();
  }
  xhr.onerror = function() {
   callback();
  }
  xhr.send();
}

}());
