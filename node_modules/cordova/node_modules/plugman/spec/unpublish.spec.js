var unpublish = require('../src/unpublish'),
    registry = require('../src/registry/registry');

describe('unpublish', function() {
    it('should unpublish a plugin', function() {
        var sUnpublish = spyOn(registry, 'unpublish');
        unpublish(new Array('myplugin@0.0.1'));
        expect(sUnpublish).toHaveBeenCalledWith(['myplugin@0.0.1'], jasmine.any(Function));
    });
});
