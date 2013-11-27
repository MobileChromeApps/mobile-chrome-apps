var search = require('../src/search'),
    Q = require('q'),
    registry = require('../src/registry/registry');

describe('search', function() {
    it('should search a plugin', function() {
        var sSearch = spyOn(registry, 'search').andReturn(Q());
        search(new Array('myplugin', 'keyword'));
        expect(sSearch).toHaveBeenCalledWith(['myplugin', 'keyword']);
    });
});
