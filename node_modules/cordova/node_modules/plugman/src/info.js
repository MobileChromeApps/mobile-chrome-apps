var registry = require('./registry/registry')

// Returns a promise.
module.exports = function(plugin) {
    return registry.info(plugin);
}
