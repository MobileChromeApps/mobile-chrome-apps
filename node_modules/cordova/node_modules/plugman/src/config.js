var registry = require('./registry/registry')

module.exports = function(params, callback) {
    registry.config(params, function(err) {
        if(callback && typeof callback === 'function') {
            err ? callback(err) : callback(null);
        } else {
            if(err) {
                throw err;
            } else {
                console.log('done');
            }
        }
    });
}
