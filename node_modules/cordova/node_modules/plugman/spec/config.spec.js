var config = require('../src/config'),
    Q = require('q'),
    registry = require('../src/registry/registry');

describe('config', function() {
    it('should run config', function() {
        var sConfig = spyOn(registry, 'config').andReturn(Q());
        var params = ['set', 'registry', 'http://registry.cordova.io'];
        config(params);
        expect(sConfig).toHaveBeenCalledWith(params);
    });
});
