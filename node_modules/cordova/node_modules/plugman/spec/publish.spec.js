var publish = require('../src/publish'),
    registry = require('../src/registry/registry');

describe('publish', function() {
    it('should publish a plugin', function() {
        var sPublish = spyOn(registry, 'publish');
        publish(new Array('/path/to/myplugin'));
        expect(sPublish).toHaveBeenCalledWith(['/path/to/myplugin'], jasmine.any(Function));
    });
});
