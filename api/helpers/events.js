define('helpers.events', function(require, module) {

  var listeners = {};
  module.exports.addListener = function(name) {
    return function(f) {
      if(!listeners[name]) {
        listeners[name] = [f];
      } else {
        listeners[name].push(f);
      }
    };
  };

  module.exports.fire = function(name) {
    return function() {
      for (var i = 0; i < listeners[name].length; i++) {
        listeners[name][i]();
      }
    };
  };
});

