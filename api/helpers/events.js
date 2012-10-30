__modules['helpers.events'] = function(require, module, chrome) {

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
      for (var i = 0, f; f = listeners[name][i]; ++i) {
        f();
      }
    };
  };
};

