var registry = require('./registry/registry')

module.exports = function(params) {
    return registry.config(params)
}
