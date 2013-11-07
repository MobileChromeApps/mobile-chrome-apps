var owner = require('../src/owner'),
    Q = require('q'),
    registry = require('../src/registry/registry');

describe('owner', function() {
    it('should run owner', function() {
        var sOwner = spyOn(registry, 'owner').andReturn(Q());
        var params = ['add', 'anis', 'com.phonegap.plugins.dummyplugin'];
        owner(params);
        expect(sOwner).toHaveBeenCalledWith(params);
    });
});
