var blackberry10 = require('../../src/platforms/blackberry10'),
    common = require('../../src/platforms/common'),
    install = require('../../src/install'),
    path = require('path'),
    fs = require('fs'),
    shell = require('shelljs'),
    et = require('elementtree'),
    os = require('osenv'),
    temp = path.join(os.tmpdir(), 'plugman'),
    plugins_dir = path.join(temp, 'cordova', 'plugins'),
    xml_helpers = require('../../src/util/xml-helpers'),
    plugins_module = require('../../src/util/plugins'),
    blackberry10_project = path.join(__dirname, '..', 'projects', 'blackberry10', '*'),
    plugins = {
        dummy: parsePlugin(path.join(__dirname, '..', 'plugins', 'DummyPlugin')),
        faulty: parsePlugin(path.join(__dirname, '..', 'plugins', 'FaultyPlugin')),
        echo: parsePlugin(path.join(__dirname, '..', 'plugins', 'cordova.echo'))
    };

function copyArray(arr) {
    return Array.prototype.slice.call(arr, 0);
}

function parsePlugin (pluginPath) {
    var pluginXML = fs.readFileSync(path.join(pluginPath, "plugin.xml"), "utf-8"),
        pluginEt = new et.ElementTree(et.XML(pluginXML)),
        platformTag = pluginEt.find('./platform[@name="blackberry10"]');

    return {
        path: pluginPath,
        id: pluginEt._root.attrib.id,
        assets: pluginEt.findall('./asset'),
        srcFiles: platformTag.findall('./source-file'),
        configChanges: platformTag.findall('./config-file'),
        libFiles: platformTag.findall('./lib-file')
    };
}


describe('blackberry10 project handler', function() {
    describe('www_dir method', function() {
        it('should return cordova-blackberry10 project www location using www_dir', function() {
            expect(blackberry10.www_dir(path.sep)).toEqual(path.sep + 'www');
        });
    });

    describe('package_name method', function() {
        it('should return a blackberry10 project\'s proper package name', function() {
            expect(blackberry10.package_name(path.join(blackberry10_project, '..'))).toEqual('cordovaExample');
        });
    });

    describe('installation', function() {
        beforeEach(function() {
            shell.mkdir('-p', temp);
            shell.cp('-rf', blackberry10_project, temp);
        });
        afterEach(function() {
            shell.rm('-rf', temp);
        });
        describe('of <lib-file> elements', function() {
            it("should copy so files to native/target/plugins", function () {
                var plugin = plugins.echo,
                    libs = copyArray(plugin.libFiles),
                    s = spyOn(common, 'copyFile');

                blackberry10['lib-file'].install(libs[0], plugin.path, temp);
                expect(s).toHaveBeenCalledWith(plugin.path, 'src/blackberry10/native/device/echoJnext.so', temp, path.join('native', 'device', 'plugins', 'jnext', 'echoJnext.so'));
            });
        });
        describe('of <source-file> elements', function() {
            it('should copy stuff from one location to another by calling common.copyFile', function() {
                var plugin = plugins.echo,
                    source = copyArray(plugin.srcFiles);
                    s = spyOn(common, 'copyFile');

                blackberry10['source-file'].install(source[0], plugin.path, temp, plugin.id);
                expect(s).toHaveBeenCalledWith(plugin.path, 'src/blackberry10/index.js', temp, path.join('native', 'device', 'chrome', 'plugin', 'cordova.echo', 'index.js'));
                expect(s).toHaveBeenCalledWith(plugin.path, 'src/blackberry10/index.js', temp, path.join('native', 'simulator', 'chrome', 'plugin', 'cordova.echo', 'index.js'));
            });
            it('defaults to plugin id when dest is not present', function() {
                var source = copyArray(plugins.dummy.srcFiles);
                var s = spyOn(common, 'copyFile');
                blackberry10['source-file'].install(source[0], plugins.dummy.path, temp, plugins.dummy.id);
                expect(s).toHaveBeenCalledWith(plugins.dummy.path, 'src/blackberry10/index.js', temp, path.join('native', 'device', 'chrome', 'plugin', plugins.dummy.id, 'index.js'));
                expect(s).toHaveBeenCalledWith(plugins.dummy.path, 'src/blackberry10/index.js', temp, path.join('native', 'simulator', 'chrome', 'plugin', plugins.dummy.id, 'index.js'));
            });
            it('should throw if source file cannot be found', function() {
                var source = copyArray(plugins.faulty.srcFiles);
                expect(function() {
                    blackberry10['source-file'].install(source[0], plugins.faulty.path, temp, plugins.faulty.id);
                }).toThrow('"' + path.resolve(plugins.faulty.path, 'src/blackberry10/index.js') + '" not found!');
            });
            it('should throw if target file already exists', function() {
                // write out a file
                var target = path.resolve(temp, 'native/device/chrome/plugin/com.phonegap.plugins.dummyplugin');
                shell.mkdir('-p', target);
                target = path.join(target, 'index.js');
                fs.writeFileSync(target, 'some bs', 'utf-8');

                var source = copyArray(plugins.dummy.srcFiles);
                expect(function() {
                    blackberry10['source-file'].install(source[0], plugins.dummy.path, temp, plugins.dummy.id);
                }).toThrow('"' + target + '" already exists!');
            });
        });
    });

    describe('uninstallation', function() {
        beforeEach(function() {
            shell.mkdir('-p', temp);
            shell.cp('-rf', blackberry10_project, temp);
        });
        afterEach(function() {
            shell.rm('-rf', temp);
        });
        describe('of <source-file> elements', function() {
            it('should remove stuff by calling common.removeFile', function() {
                var s = spyOn(common, 'removeFile'),
                    plugin = plugins.echo;
                var source = copyArray(plugin.srcFiles);
                blackberry10['source-file'].install(source[0], plugin.path, temp, plugin.id);
                blackberry10['source-file'].uninstall(source[0], temp, plugin.id);
                expect(s).toHaveBeenCalledWith(temp, path.join('native', 'device', 'chrome', 'plugin', 'cordova.echo', 'index.js'));
                expect(s).toHaveBeenCalledWith(temp, path.join('native', 'simulator', 'chrome', 'plugin', 'cordova.echo', 'index.js'));
            });
            it('should remove stuff by calling common.removeFile', function() {
                var s = spyOn(common, 'removeFile'),
                    plugin = plugins.dummy;
                var source = copyArray(plugin.srcFiles);
                blackberry10['source-file'].install(source[0], plugin.path, temp, plugin.id);
                blackberry10['source-file'].uninstall(source[0], temp, plugin.id);
                expect(s).toHaveBeenCalledWith(temp, path.join('native', 'device', 'chrome', 'plugin', plugin.id, 'index.js'));
                expect(s).toHaveBeenCalledWith(temp, path.join('native', 'simulator', 'chrome', 'plugin', plugin.id, 'index.js'));
            });
        });
        describe('of <lib-file> elements', function(done) {
            it("should remove so files from www/plugins", function () {
                var s = spyOn(common, 'removeFile'),
                    plugin = plugins.echo;
                var source = copyArray(plugin.libFiles);
                blackberry10['lib-file'].install(source[0], plugin.path, temp, plugin.id);
                blackberry10['lib-file'].uninstall(source[0], temp, plugin.id);
                expect(s).toHaveBeenCalledWith(temp, path.join('native','device','plugins','jnext','echoJnext.so'));
            });
        });
    });
});
