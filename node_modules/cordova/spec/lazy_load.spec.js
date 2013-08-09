var lazy_load = require('../src/lazy_load'),
    config = require('../src/config'),
    util = require('../src/util'),
    shell = require('shelljs'),
    npm = require('npm');
    path = require('path'),
    hooker = require('../src/hooker'),
    request = require('request'),
    fs = require('fs'),
    platforms = require('../platforms');

describe('lazy_load module', function() {
    var custom_path;
    beforeEach(function() {
        custom_path = spyOn(config, 'has_custom_path').andReturn(false);
    });
    describe('cordova method (loads stock cordova libs)', function() {
        var custom;
        beforeEach(function() {
            custom = spyOn(lazy_load, 'custom');
        });
        it('should throw if platform is not a stock cordova platform', function() {
            expect(function() {
                lazy_load.cordova('atari');
            }).toThrow('Cordova library "atari" not recognized.');
        });
        it('should invoke lazy_load.custom with appropriate url, platform, and version as specified in platforms manifest', function() {
            lazy_load.cordova('android');
            expect(custom).toHaveBeenCalledWith(platforms.android.url + ';a=snapshot;h=' + platforms.android.version + ';sf=tgz', 'cordova', 'android', platforms.android.version, jasmine.any(Function));
        });
    });

    describe('custom method (loads custom cordova libs)', function() {
        var mkdir, exists, fire, rm, sym;
        beforeEach(function() {
            mkdir = spyOn(shell, 'mkdir');
            rm = spyOn(shell, 'rm');
            sym = spyOn(fs, 'symlinkSync');
            exists = spyOn(fs, 'existsSync').andReturn(false);
            fire = spyOn(hooker, 'fire').andCallFake(function(evt, data, cb) {
                cb();
            });
        });

        it('should callback with no errors and not fire event hooks if library already exists', function(done) {
            exists.andReturn(true);
            lazy_load.custom('some url', 'some id', 'platform X', 'three point five', function(err) {
                expect(err).not.toBeDefined();
                expect(fire).not.toHaveBeenCalled()
                done();
            });
        });
        it('should fire a before_library_download event before it starts downloading a library', function() {
            lazy_load.custom('some url', 'some id', 'platform X', 'three point five');
            expect(fire).toHaveBeenCalledWith('before_library_download', {platform:'platform X', url:'some url', id:'some id', version:'three point five'}, jasmine.any(Function));
        });

        describe('remote URLs for libraries', function() {
            var req,
                load_spy,
                p1 = jasmine.createSpy().andReturn({
                    on:function() {
                        return {
                            on:function(){}
                        }
                    }
                });
            var p2 = jasmine.createSpy().andReturn({pipe:p1});
            beforeEach(function() {
                req = spyOn(request, 'get').andReturn({
                    pipe:p2
                });
                load_spy = spyOn(npm, 'load').andCallFake(function(cb) { cb(); });
                npm.config.get = function() { return null; };
            });

            it('should call request with appopriate url params', function() {
                var url = 'https://github.com/apache/someplugin';
                lazy_load.custom(url, 'random', 'android', '1.0');
                expect(req).toHaveBeenCalledWith({
                    uri:url
                }, jasmine.any(Function));
            });
            it('should take into account https-proxy npm configuration var if exists for https:// calls', function() {
                var proxy = 'https://somelocalproxy.com';
                npm.config.get = function() { return proxy; };
                var url = 'https://github.com/apache/someplugin';
                lazy_load.custom(url, 'random', 'android', '1.0');
                expect(req).toHaveBeenCalledWith({
                    uri:url,
                    proxy:proxy
                }, jasmine.any(Function));
            });
            it('should take into account proxy npm config var if exists for http:// calls', function() {
                var proxy = 'http://somelocalproxy.com';
                npm.config.get = function() { return proxy; };
                var url = 'http://github.com/apache/someplugin';
                lazy_load.custom(url, 'random', 'android', '1.0');
                expect(req).toHaveBeenCalledWith({
                    uri:url,
                    proxy:proxy
                }, jasmine.any(Function));
            });
        });

        describe('local paths for libraries', function() {
            it('should symlink to local path', function() {
                lazy_load.custom('/some/random/lib', 'id', 'X', 'three point five')
                expect(sym).toHaveBeenCalledWith('/some/random/lib', path.join(util.libDirectory, 'X', 'id', 'three point five'), 'dir');
            });
            it('should fire after hook once done', function() {
                lazy_load.custom('/some/random/lib', 'id', 'X', 'three point five')
                expect(fire).toHaveBeenCalledWith('after_library_download', {platform:'X',url:'/some/random/lib',id:'id',version:'three point five',path:path.join(util.libDirectory, 'X', 'id', 'three point five'), symlink:true}, jasmine.any(Function));
            });
        });
    });

    describe('based_on_config method', function() {
        var cordova, custom;
        beforeEach(function() {
            cordova = spyOn(lazy_load, 'cordova');
            custom = spyOn(lazy_load, 'custom');
        });
        it('should invoke custom if a custom lib is specified', function() {
            var read = spyOn(config, 'read').andReturn({
                lib:{
                    maybe:{
                        uri:'you or eye?',
                        id:'eye dee',
                        version:'four point twenty'
                    }
                }
            });
            var p = '/some/random/custom/path';
            custom_path.andReturn(p);
            lazy_load.based_on_config('yup', 'maybe');
            expect(custom).toHaveBeenCalledWith('you or eye?', 'eye dee', 'maybe', 'four point twenty', undefined);
        });
        it('should invoke cordova if no custom lib is specified', function() {
            lazy_load.based_on_config('yup', 'ios');
            expect(cordova).toHaveBeenCalledWith('ios', undefined);
        });
    });
});
