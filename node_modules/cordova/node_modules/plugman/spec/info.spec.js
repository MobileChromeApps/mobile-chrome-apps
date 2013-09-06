var search = require('../src/info'),
    registry = require('../src/registry/registry');

describe('info', function() {
    it('should show plugin info', function() {
        var sSearch = spyOn(registry, 'info');
        search(new Array('myplugin'));
        expect(sSearch).toHaveBeenCalledWith(['myplugin'], jasmine.any(Function));
    });
});
