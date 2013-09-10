var registry = require('./registry/registry')

module.exports = function(plugin_path, callback) {
    // plugin_path is an array of paths
    registry.publish(plugin_path, function(err, d) {
        if(callback && typeof callback === 'function') {
            err ? callback(err) : callback(null);
        } else {
            if(err) {
                    throw err;
            } else {
                    console.log('Plugin published');
            }
        }
    });
}
