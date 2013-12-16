var amazon_fireos = require('../../src/platforms/amazon-fireos'),
    common  = require('../../src/platforms/common'),
    install = require('../../src/install'),
    path    = require('path'),
    fs      = require('fs'),
    shell   = require('shelljs'),
    et      = require('elementtree'),
    os      = require('osenv'),
    temp    = path.join(os.tmpdir(), 'plugman'),
    plugins_dir = path.join(temp, 'cordova', 'plugins'),
    xml_helpers = require('../../src/util/xml-helpers'),
    plugins_module = require('../../src/util/plugins'),
    dummyplugin = path.join(__dirname, '..', 'plugins', 'DummyPlugin'),
    faultyplugin = path.join(__dirname, '..', 'plugins', 'FaultyPlugin'),
    variableplugin = path.join(__dirname, '..', 'plugins', 'VariablePlugin'),
    amzon_fireos_one_project = path.join(__dirname, '..', 'projects', 'android_one', '*'),
    amazon_fireos_two_project = path.join(__dirname, '..', 'projects', 'android_two', '*');

var xml_path     = path.join(dummyplugin, 'plugin.xml')
  , xml_text     = fs.readFileSync(xml_path, 'utf-8')
  , plugin_et    = new et.ElementTree(et.XML(xml_text));
  
var platformTag = plugin_et.find('./platform[@name="amazon-fireos"]');
var dummy_id = plugin_et._root.attrib['id'];

var valid_source = platformTag.findall('./source-file'),
    valid_libs = platformTag.findall('./lib-file'),
    assets = plugin_et.findall('./asset'),
    configChanges = platformTag.findall('./config-file');

xml_path  = path.join(faultyplugin, 'plugin.xml')
xml_text  = fs.readFileSync(xml_path, 'utf-8')
plugin_et = new et.ElementTree(et.XML(xml_text));

platformTag = plugin_et.find('./platform[@name="amazon-fireos"]');
var invalid_source = platformTag.findall('./source-file');
var faulty_id = plugin_et._root.attrib['id'];
xml_path  = path.join(variableplugin, 'plugin.xml')
xml_text  = fs.readFileSync(xml_path, 'utf-8')
plugin_et = new et.ElementTree(et.XML(xml_text));
platformTag = plugin_et.find('./platform[@name="amazon-fireos"]');

var variable_id = plugin_et._root.attrib['id'];
var variable_configs = platformTag.findall('./config-file');

function copyArray(arr) {
    return Array.prototype.slice.call(arr, 0);
}
/*
describe('amazon-fireos project handler', function() {
    describe('www_dir method', function() {
        it('should return cordova-amazon-fireos project www location using www_dir', function() {
            expect(amazon_fireos.www_dir(path.sep)).toEqual(path.sep + path.join('assets', 'www'));
        });
    });
    describe('package_name method', function() {
        it('should return an amazon-fireos project\'s proper package name', function() {
            expect(amazon_fireos.package_name(path.join(amazon_fireos_one_project, '..'))).toEqual('com.alunny.childapp');
        });
    });

    describe('installation', function() {
        beforeEach(function() {
            shell.mkdir('-p', temp);
        });
        afterEach(function() {
            shell.rm('-rf', temp);
        });
        describe('of <lib-file> elements', function() {
            it("should copy jar files to project/libs", function () {
                var s = spyOn(common, 'copyFile');

                amazon_fireos['lib-file'].install(valid_libs[0], dummyplugin, temp);
                expect(s).toHaveBeenCalledWith(dummyplugin, 'src/amazon-fireos/TestLib.jar', temp, path.join('libs', 'TestLib.jar'));
            });
        });
        describe('of <source-file> elements', function() {
            beforeEach(function() {
                shell.cp('-rf', amazon_fireos_one_project, temp);
            });

            it('should copy stuff from one location to another by calling common.copyFile', function() {
                var source = copyArray(valid_source);
                var s = spyOn(common, 'copyFile');
                amazon_fireos['source-file'].install(source[0], dummyplugin, temp); 
                expect(s).toHaveBeenCalledWith(dummyplugin, 'src/amazon-fireos/DummyPlugin.java', temp, path.join('src', 'com', 'phonegap', 'plugins', 'dummyplugin', 'DummyPlugin.java'));
            });
            it('should throw if source file cannot be found', function() {
                var source = copyArray(invalid_source);
                expect(function() {
                    amazon_fireos['source-file'].install(source[0], faultyplugin, temp); 
                }).toThrow('"' + path.resolve(faultyplugin, 'src/amazon-fireos/NotHere.java') + '" not found!');
            });
            it('should throw if target file already exists', function() {
                // write out a file
                var target = path.resolve(temp, 'src/com/phonegap/plugins/dummyplugin');
                shell.mkdir('-p', target);
                target = path.join(target, 'DummyPlugin.java');
                fs.writeFileSync(target, 'some bs', 'utf-8');

                var source = copyArray(valid_source);
                expect(function() {
                    amazon_fireos['source-file'].install(source[0], dummyplugin, temp); 
                }).toThrow('"' + target + '" already exists!');
            });
        });
    });

    describe('uninstallation', function() {
        beforeEach(function() {
            shell.mkdir('-p', temp);
            shell.mkdir('-p', plugins_dir);
            shell.cp('-rf', amazon_fireos_two_project, temp);
        });
        afterEach(function() {
            shell.rm('-rf', temp);
        });
        describe('of <lib-file> elements', function(done) {
            it('should remove jar files', function () {
                var s = spyOn(common, 'removeFile');
                amazon_fireos['lib-file'].install(valid_libs[0], dummyplugin, temp);
                amazon_fireos['lib-file'].uninstall(valid_libs[0], temp, dummy_id);
                expect(s).toHaveBeenCalledWith(temp, path.join('libs', 'TestLib.jar'));
            });
        });
        describe('of <source-file> elements', function() {
            it('should remove stuff by calling common.deleteJava', function(done) {
                var s = spyOn(common, 'deleteJava');
                install('amazon-fireos', temp, dummyplugin, plugins_dir, {})
                .then(function() {
                    var source = copyArray(valid_source);
                    amazon_fireos['source-file'].uninstall(source[0], temp);
                    expect(s).toHaveBeenCalledWith(temp, path.join('src', 'com', 'phonegap', 'plugins', 'dummyplugin', 'DummyPlugin.java'));
                    done();
                });
            });
        });
    });
}); */
