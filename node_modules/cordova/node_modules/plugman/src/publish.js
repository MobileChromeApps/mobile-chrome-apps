var registry = require('./registry/registry')

module.exports = function(plugin_path) {
    // plugin_path is an array of paths
    return registry.publish(plugin_path);
}
