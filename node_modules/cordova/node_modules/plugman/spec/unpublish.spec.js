var unpublish = require('../src/unpublish'),
    Q = require('q'),
    registry = require('../src/registry/registry');

describe('unpublish', function() {
    it('should unpublish a plugin', function() {
        var sUnpublish = spyOn(registry, 'unpublish').andReturn(Q());
        unpublish(new Array('myplugin@0.0.1'));
        expect(sUnpublish).toHaveBeenCalledWith(['myplugin@0.0.1']);
    });
});
