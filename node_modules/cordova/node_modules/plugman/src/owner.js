var registry = require('./registry/registry');

// Returns a promise.
module.exports = function(args) {
    return registry.owner(args);
};
