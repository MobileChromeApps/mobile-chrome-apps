var registry = require('./registry/registry')

module.exports = function(search_opts, callback) {
    registry.search(search_opts, function(err, plugins) {
        if(callback) {
            if(err) return callback(err);
            callback(null, plugins);
        } else {
            if(err) return console.log(err);
            for(var plugin in plugins) {
              console.log(plugins[plugin].name, '-', plugins[plugin].description || 'no description provided'); 
            }
        }
    });
}
