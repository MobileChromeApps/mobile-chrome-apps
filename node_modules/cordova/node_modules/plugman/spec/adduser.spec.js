var adduser = require('../src/adduser'),
    registry = require('../src/registry/registry');

describe('adduser', function() {
    it('should add a user', function() {
        var sAddUser = spyOn(registry, 'adduser');
        adduser(function(err, result) { });
        expect(sAddUser).toHaveBeenCalledWith(null, jasmine.any(Function));
    });
});
