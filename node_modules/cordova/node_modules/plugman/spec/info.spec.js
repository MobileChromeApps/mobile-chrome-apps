var search = require('../src/info'),
    Q = require('q'),
    registry = require('../src/registry/registry');

describe('info', function() {
    it('should show plugin info', function() {
        var sSearch = spyOn(registry, 'info').andReturn(Q({
            name: 'fakePlugin',
            version: '1.0.0',
            engines: [{ name: 'plugman', version: '>=0.11' }]
        }));
        search(new Array('myplugin'));
        expect(sSearch).toHaveBeenCalledWith(['myplugin']);
    });
});
