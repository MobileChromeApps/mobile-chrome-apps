var registry = require('../../src/registry/registry'),
    manifest = require('../../src/registry/manifest'),
    fs = require('fs'),
    path = require('path'),
    npm = require('npm');

describe('registry', function() {
    describe('manifest', function() {
        var pluginDir, packageJson;
        beforeEach(function() {
            pluginDir = __dirname + '/../plugins/EnginePlugin';
            packageJson = path.resolve(pluginDir, 'package.json');
        });
        afterEach(function() {
            fs.unlink(packageJson);
            
        });
        it('should generate a package.json from a plugin.xml', function() {
            manifest.generatePackageJsonFromPluginXml(pluginDir);
            expect(fs.existsSync(packageJson));
            expect(JSON.parse(fs.readFileSync(packageJson)).name).toEqual('com.cordova.engine');
            expect(JSON.parse(fs.readFileSync(packageJson)).version).toEqual('1.0.0');
            expect(JSON.parse(fs.readFileSync(packageJson)).engines).toEqual(
            [ { name : 'cordova', version : '>=2.3.0' }, { name : 'cordova-plugman', version : '>=0.10.0' }, { name : 'mega-fun-plugin', version : '>=1.0.0' }, { name : 'mega-boring-plugin', version : '>=3.0.0' } ]
            );
        });
    });
    describe('actions', function() {
        beforeEach(function() {
            var fakeSettings = {
                cache: '/some/cache/dir',
                logstream: 'somelogstream@2313213',
                userconfig: '/some/config/dir'
            };
            var fakeNPMCommands = {
                config: function() {},
                adduser: function() {},
                publish: function() {},
                unpublish: function() {},
                search: function() {}
            }
            registry.settings = fakeSettings;
            npm.commands = fakeNPMCommands;
        });
        it('should run config', function() {
            var params = ['set', 'registry', 'http://registry.cordova.io'];
            var sLoad = spyOn(npm, 'load').andCallFake(function(err, cb) {
                cb();   
            });
            var sConfig = spyOn(npm.commands, 'config');
            registry.config(params, function() {});
            expect(sLoad).toHaveBeenCalledWith(registry.settings, jasmine.any(Function));
            expect(sConfig).toHaveBeenCalledWith(params, jasmine.any(Function));
        });
        it('should run adduser', function() {
            var sLoad = spyOn(npm, 'load').andCallFake(function(err, cb) {
                cb();   
            });
            var sAddUser = spyOn(npm.commands, 'adduser');
            registry.adduser(null, function() {});
            expect(sLoad).toHaveBeenCalledWith(registry.settings, jasmine.any(Function));
            expect(sAddUser).toHaveBeenCalledWith(null, jasmine.any(Function));
        });
        it('should run publish', function() {
            var params = [__dirname + '/../plugins/DummyPlugin'];
            var sLoad = spyOn(npm, 'load').andCallFake(function(err, cb) {
                cb();
            });
            var sPublish = spyOn(npm.commands, 'publish');
            var sGenerate = spyOn(manifest, 'generatePackageJsonFromPluginXml');
            registry.publish(params, function() {});
            expect(sLoad).toHaveBeenCalledWith(registry.settings, jasmine.any(Function));
            expect(sGenerate).toHaveBeenCalledWith(params[0]);
            expect(sPublish).toHaveBeenCalledWith(params, jasmine.any(Function));
        });
        it('should run unpublish', function() {
            var params = ['dummyplugin@0.6.0'];
            var sLoad = spyOn(npm, 'load').andCallFake(function(err, cb) {
                cb();
            });
            var sUnpublish = spyOn(npm.commands, 'unpublish');
            registry.unpublish(params, function() {});
            expect(sLoad).toHaveBeenCalledWith(registry.settings, jasmine.any(Function));
            expect(sUnpublish).toHaveBeenCalledWith(params, jasmine.any(Function));
        });
        it('should run search', function() {
            var params = ['dummyplugin', 'plugin'];
            var sLoad = spyOn(npm, 'load').andCallFake(function(err, cb) {
                cb();
            });
            var sSearch = spyOn(npm.commands, 'search');
            registry.search(params, function() {});
            expect(sLoad).toHaveBeenCalledWith(registry.settings, jasmine.any(Function));
            expect(sSearch).toHaveBeenCalledWith(params, true, jasmine.any(Function));
        });
    });
});
