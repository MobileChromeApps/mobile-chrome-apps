var registry = require('./registry/registry')

module.exports = function(plugin, callback) {
    registry.info(plugin, function(err, plugin_info) {
        if(callback) {
            if(err) return callback(err);
            callback(null, plugins);
        } else {
            if(err) return console.log(err);
            console.log('name:', plugin_info.name);
            console.log('version:', plugin_info.version);
            if(plugin_info.engines) {
                for(var i = 0, j = plugin_info.engines.length ; i < j ; i++) {
                    console.log(plugin_info.engines[i].name, 'version:', plugin_info.engines[i].version);
                }
            }
        }
    });
}
