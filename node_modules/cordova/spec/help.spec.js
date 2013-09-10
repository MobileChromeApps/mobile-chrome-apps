var cordova = require('../cordova');

describe('help command', function() {
    it('should emit a results event with help contents', function(done) {
        this.after(function() {
            cordova.removeAllListeners('results');
        });
        cordova.on('results', function(h) {
            expect(h).toMatch(/synopsis/gi);
            done();
        });
        cordova.help();
    });
});
