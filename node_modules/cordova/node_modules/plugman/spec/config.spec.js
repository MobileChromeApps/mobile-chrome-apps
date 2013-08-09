var config = require('../src/config'),
    registry = require('../src/registry/registry');

describe('config', function() {
    it('should run config', function() {
        var sConfig = spyOn(registry, 'config');
        var params = ['set', 'registry', 'http://registry.cordova.io'];
        config(params, function(err, result) { });
        expect(sConfig).toHaveBeenCalledWith(params, jasmine.any(Function));
    });
});
