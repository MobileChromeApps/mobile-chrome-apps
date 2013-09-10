var wp7 = require('../../src/platforms/wp7'),
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
    wp7_project = path.join(__dirname, '..', 'projects', 'wp7');

var xml_path     = path.join(dummyplugin, 'plugin.xml')
  , xml_text     = fs.readFileSync(xml_path, 'utf-8')
  , plugin_et    = new et.ElementTree(et.XML(xml_text));

var platformTag = plugin_et.find('./platform[@name="wp7"]');
var dummy_id = plugin_et._root.attrib['id'];
var valid_source = platformTag.findall('./source-file'),
    assets = plugin_et.findall('./asset'),
    configChanges = platformTag.findall('./config-file');
xml_path  = path.join(faultyplugin, 'plugin.xml')
xml_text  = fs.readFileSync(xml_path, 'utf-8')
plugin_et = new et.ElementTree(et.XML(xml_text));

platformTag = plugin_et.find('./platform[@name="wp7"]');
var invalid_source = platformTag.findall('./source-file');
var faulty_id = plugin_et._root.attrib['id'];

shell.mkdir('-p', temp);
shell.cp('-rf', path.join(wp7_project, '*'), temp);
var proj_files = wp7.parseProjectFile(temp);
shell.rm('-rf', temp);

function copyArray(arr) {
    return Array.prototype.slice.call(arr, 0);
}

describe('wp7 project handler', function() {

    beforeEach(function() {
        shell.mkdir('-p', temp);
        shell.mkdir('-p', plugins_dir);
    });
    afterEach(function() {
        shell.rm('-rf', temp);
    });

    describe('www_dir method', function() {
        it('should return cordova-wp7 project www location using www_dir', function() {
            expect(wp7.www_dir(path.sep)).toEqual(path.sep + 'www');
        });
    });
    describe('package_name method', function() {
        it('should return a wp7 project\'s proper package name', function() {
            expect(wp7.package_name(wp7_project)).toEqual("{5FC10D78-8779-4EDB-9B61-1D04F0A755D4}");
        });
    });

    describe('parseProjectFile method', function() {
        it('should throw if project is not an wp7 project', function() {
            expect(function() {
                wp7.parseProjectFile(temp);
            }).toThrow('does not appear to be a Windows Phone project (no .csproj file)');
        });
    });

    describe('installation', function() {
        beforeEach(function() {
            shell.mkdir('-p', temp);
        });
        afterEach(function() {
            shell.rm('-rf', temp);
        });
        describe('of <source-file> elements', function() {
            beforeEach(function() {
                shell.cp('-rf', path.join(wp7_project, '*'), temp);
            });
            it('should copy stuff from one location to another by calling common.copyFile', function() {
                var source = copyArray(valid_source);
                var s = spyOn(common, 'copyFile');
                wp7['source-file'].install(source[0], dummyplugin, temp, dummy_id, proj_files); 
                expect(s).toHaveBeenCalledWith(dummyplugin, 'src/wp7/DummyPlugin.cs', temp, path.join('Plugins', 'com.phonegap.plugins.dummyplugin', 'DummyPlugin.cs'));
            });
            it('should throw if source-file src cannot be found', function() {
                var source = copyArray(invalid_source);
                expect(function() {
                    wp7['source-file'].install(source[1], faultyplugin, temp, faulty_id, proj_files);
                }).toThrow('"' + path.resolve(faultyplugin, 'src/wp7/NotHere.cs') + '" not found!');
            });
            it('should throw if source-file target already exists', function() {
                var source = copyArray(valid_source);
                var target = path.join(temp, 'Plugins', dummy_id, 'DummyPlugin.cs');
                shell.mkdir('-p', path.dirname(target));
                fs.writeFileSync(target, 'some bs', 'utf-8');
                expect(function() {
                    wp7['source-file'].install(source[0], dummyplugin, temp, dummy_id, proj_files);
                }).toThrow('"' + target + '" already exists!');
            });
        });
    });

    describe('uninstallation', function() {
        beforeEach(function() {
            shell.mkdir('-p', temp);
            shell.mkdir('-p', plugins_dir);
            shell.cp('-rf', path.join(wp7_project, '*'), temp);
        });
        afterEach(function() {
            shell.rm('-rf', temp);
        });
        describe('of <source-file> elements', function() {
            it('should remove stuff by calling common.removeFile', function(done) {
                var s = spyOn(common, 'removeFile');
                install('wp7', temp, dummyplugin, plugins_dir, {}, function() {
                    var source = copyArray(valid_source);
                    wp7['source-file'].uninstall(source[0], temp, dummy_id, proj_files);
                    expect(s).toHaveBeenCalledWith(temp, path.join('Plugins', 'com.phonegap.plugins.dummyplugin', 'DummyPlugin.cs'));
                    done();
                });
            });
        });
    });
});
