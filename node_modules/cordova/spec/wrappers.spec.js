var Q = require('q'),
    cordova = require('../cordova');

describe('callback wrapper', function() {
    var calls = ['prepare', 'build', 'create', 'emulate', 'plugin', 'platform', 'compile', 'run'];
    for (var i = 0; i < calls.length; i++) {
        var call = calls[i];

        describe('`' + call + '`', function() {
            var raw;
            beforeEach(function() {
                raw = spyOn(cordova.raw, call);
            });

            it('should work with no callback and success', function() {
                raw.andReturn(Q());
                cordova[call]();
                expect(raw).toHaveBeenCalled();
            });

            it('should call the callback on success', function(done) {
                raw.andReturn(Q());
                cordova[call](function(err) {
                    expect(err).toBeUndefined();
                    done();
                });
            });

            it('should call the callback with the error on failure', function(done) {
                raw.andReturn(Q.reject(new Error('junk')));
                cordova[call](function(err) {
                    expect(err).toEqual(new Error('junk'));
                    done();
                });
            });
        });
    }
});

