var cordova = require('../cordova'),
    path = require('path'),
    shell = require('shelljs'),
    fs = require('fs'),
    cordova_util = require('../src/util');

var cwd = process.cwd();
var project_dir = path.join('spec', 'fixtures', 'templates');

describe('info flag', function(){
    var is_cordova,
        writeFileSync,
        cordova_utilSpy,
        readFileSync,
        shellSpy,
        exec = {},
        done = false;

    function infoPromise( f ) {
        f.then( function() { done = true; }, function(err) { done = err; } );
    }

    beforeEach(function() {
        is_cordova = spyOn(cordova_util, 'isCordova').andReturn(project_dir);
        writeFileSync = spyOn( fs, 'writeFileSync' );
        shellSpy = spyOn( shell, 'exec' ).andReturn( "" );
        cordova_utilSpy = spyOn( cordova_util, 'projectConfig').andReturn( fs.readFileSync( project_dir + "/no_content_config.xml" ) );
        done = false;
    });

    it('should not run outside of a Cordova-based project by calling util.isCordova', function() {
        is_cordova.andReturn(false);
        runs(function() {
            infoPromise( cordova.info() );
        });
        waitsFor(function() { return done; }, 'platform promise never resolved', 500);
        runs(function() {
            expect( done ).toEqual( new Error( 'Current working directory is not a Cordova-based project.' ) );
        });
    });

    it('should run inside a Cordova-based project by calling util.isCordova', function() {
        readFileSync = spyOn( fs, 'readFileSync' ).andReturn( "" );
         cordova.raw.info().then(function() {
            expect(is_cordova).toHaveBeenCalled();
            done();
        });
    });

    it('should emit a results event with info contents', function(done) {
        readFileSync = spyOn( fs, 'readFileSync' ).andReturn( "info" );
        this.after(function() {
            cordova.removeAllListeners('results');
        });
        cordova.on('results', function(h) {
            expect(h).toMatch(/info/gi);
            done();
        });
        cordova.info();
    });
});
