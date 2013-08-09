var search = require('../src/search'),
    registry = require('../src/registry/registry');

describe('search', function() {
    it('should search a plugin', function() {
        var sSearch = spyOn(registry, 'search');
        search(new Array('myplugin', 'keyword'));
        expect(sSearch).toHaveBeenCalledWith(['myplugin', 'keyword'], jasmine.any(Function));
    });
});
