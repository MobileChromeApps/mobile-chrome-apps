var cordova = require('../cordova'),
    path = require('path'),
    shell = require('shelljs'),
    fs = require('fs'),
    Q = require('q'),
    cordova_util = require('../src/util');

var cwd = process.cwd();
var project_dir = path.join('spec', 'fixtures', 'templates');

describe('info flag', function(){
    var is_cordova,
        cd_project_root,
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
        cd_project_root = spyOn(cordova_util, 'cdProjectRoot').andReturn(project_dir);
        writeFileSync = spyOn( fs, 'writeFileSync' );
        shellSpy = spyOn( shell, 'exec' ).andReturn( "" );
        cordova_utilSpy = spyOn( cordova_util, 'projectConfig').andReturn(project_dir + '/no_content_config.xml' );
        done = false;
    });

    it('should not run outside of a Cordova-based project by calling util.isCordova', function() {
        var msg = 'Dummy message about not being in a cordova dir.';
        cd_project_root.andThrow(new Error(msg));
        is_cordova.andReturn(false);
        runs(function() {
            infoPromise( Q().then(cordova.raw.info) );
        });
        waitsFor(function() { return done; }, 'platform promise never resolved', 500);
        runs(function() {
            expect( done.message ).toEqual( msg );
        });
    });

    it('should run inside a Cordova-based project by calling util.isCordova', function() {
        readFileSync = spyOn( fs, 'readFileSync' ).andReturn( "" );
         cordova.raw.info().then(function() {
            expect(cd_cordova_root).toHaveBeenCalled();
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
