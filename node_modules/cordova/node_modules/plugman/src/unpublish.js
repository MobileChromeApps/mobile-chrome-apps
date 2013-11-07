var registry = require('./registry/registry')

module.exports = function(plugin) {
    return registry.unpublish(plugin);
}
