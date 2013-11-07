var registry = require('./registry/registry')

module.exports = function(search_opts) {
    return registry.search(search_opts);
}
