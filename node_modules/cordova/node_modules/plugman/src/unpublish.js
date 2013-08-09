var registry = require('./registry/registry')

module.exports = function(plugin, callback) {
    registry.unpublish(plugin, function(err, d) {
        if(callback && typeof callback === 'function') {
            err ? callback(err) : callback(null);
        } else {
            if(err) {
                throw err;
            } else {
                console.log('Plugin unpublished');
            }
        }
    });
}
