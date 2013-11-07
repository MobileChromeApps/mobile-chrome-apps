var Q = require('q'),
    plugman = require('../plugman');

describe('callback wrapper', function() {
    var calls = ['install', 'uninstall', 'fetch', 'config', 'owner', 'adduser', 'publish', 'unpublish', 'search', 'info'];
    for (var i = 0; i < calls.length; i++) {
        var call = calls[i];

        describe('`' + call + '`', function() {
            var raw;
            beforeEach(function() {
                raw = spyOn(plugman.raw, call);
            });

            it('should work with no callback and success', function() {
                raw.andReturn(Q());
                plugman[call]();
                expect(raw).toHaveBeenCalled();
            });

            it('should call the callback on success', function(done) {
                raw.andReturn(Q());
                plugman[call](function(err) {
                    expect(err).toBeUndefined();
                    done();
                });
            });

            it('should call the callback with the error on failure', function(done) {
                raw.andReturn(Q.reject(new Error('junk')));
                plugman[call](function(err) {
                    expect(err).toEqual(new Error('junk'));
                    done();
                });
            });
        });
    }
});

