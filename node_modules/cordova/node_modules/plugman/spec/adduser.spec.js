var adduser = require('../src/adduser'),
    Q = require('q'),
    registry = require('../src/registry/registry');

describe('adduser', function() {
    it('should add a user', function() {
        var sAddUser = spyOn(registry, 'adduser').andReturn(Q());
        adduser();
        expect(sAddUser).toHaveBeenCalled();
    });
});
