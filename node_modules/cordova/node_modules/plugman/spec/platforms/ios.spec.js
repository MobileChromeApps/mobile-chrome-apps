var ios = require('../../src/platforms/ios'),
    install = require('../../src/install'),
    path = require('path'),
    fs = require('fs'),
    et = require('elementtree'),
    shell = require('shelljs'),
    os = require('osenv'),
    common = require('../../src/platforms/common'),
    xcode = require('xcode'),
    plist = require('plist'),
    bplist = require('bplist-parser'),
    temp = path.join(os.tmpdir(), 'plugman'),
    plugins_dir = path.join(temp, 'cordova', 'plugins'),
    ios_config_xml_project = path.join(__dirname, '..', 'projects', 'ios-config-xml', '*'),
    ios_plist_project = path.join(__dirname, '..', 'projects', 'ios-plist', '*'),
    ios_project = path.join(ios_config_xml_project, '..'),
    xml_helpers = require('../../src/util/xml-helpers'),
    variableplugin = path.join(__dirname, '..', 'plugins', 'VariablePlugin'),
    faultyplugin = path.join(__dirname, '..', 'plugins', 'FaultyPlugin'),
    plistplugin = path.join(__dirname, '..', 'plugins', 'PluginsPlistOnly'),
    dummyplugin = path.join(__dirname, '..', 'plugins', 'DummyPlugin');

var xml_path = path.join(dummyplugin, 'plugin.xml'),
    xml_test = fs.readFileSync(xml_path, 'utf-8'),
    plugin_et = new et.ElementTree(et.XML(xml_test));

var platformTag = plugin_et.find('./platform[@name="ios"]');
var dummy_id = plugin_et._root.attrib['id'];
var valid_source = platformTag.findall('./source-file'),
    valid_assets = plugin_et.findall('./asset'),
    valid_headers = platformTag.findall('./header-file'),
    valid_resources = platformTag.findall('./resource-file'),
    valid_frameworks = platformTag.findall('./framework'),
    plist_els = platformTag.findall('./plugins-plist'),
    dummy_configs = platformTag.findall('./config-file');

xml_path = path.join(variableplugin, 'plugin.xml');
xml_test = fs.readFileSync(xml_path, 'utf-8');
plugin_et = new et.ElementTree(et.XML(xml_test));
platformTag = plugin_et.find('./platform[@name="ios"]');

var variable_id = plugin_et._root.attrib['id'];
var variable_configs = platformTag.findall('./config-file');

xml_path = path.join(faultyplugin, 'plugin.xml');
xml_test = fs.readFileSync(xml_path, 'utf-8');
plugin_et = new et.ElementTree(et.XML(xml_test));
platformTag = plugin_et.find('./platform[@name="ios"]');

var faulty_id = plugin_et._root.attrib['id'];
var invalid_assets = plugin_et.findall('./asset');
var invalid_source = platformTag.findall('./source-file');
var invalid_headers = platformTag.findall('./header-file');
var invalid_resources = platformTag.findall('./resource-file');
var invalid_frameworks = platformTag.findall('./framework');

xml_path = path.join(plistplugin, 'plugin.xml');
xml_test = fs.readFileSync(xml_path, 'utf-8');
plugin_et = new et.ElementTree(et.XML(xml_test));
platformTag = plugin_et.find('./platform[@name="ios"]');

var plist_id = plugin_et._root.attrib['id'];
var plist_only_els = platformTag.findall('./plugins-plist');

shell.mkdir('-p', temp);
shell.cp('-rf', ios_config_xml_project, temp);
var proj_files = ios.parseIOSProjectFiles(temp);
shell.rm('-rf', temp);

function copyArray(arr) {
    return Array.prototype.slice.call(arr, 0);
}

describe('ios project handler', function() {
    beforeEach(function() {
        shell.mkdir('-p', temp);
        shell.mkdir('-p', plugins_dir);
    });
    afterEach(function() {
        shell.rm('-rf', temp);
    });

    describe('www_dir method', function() {
        it('should return cordova-ios project www location using www_dir', function() {
            expect(ios.www_dir(path.sep)).toEqual(path.sep + 'www');
        });
    });

    describe('package_name method', function() {
        it('should return the CFBundleIdentifier from the project\'s Info.plist file', function() {
            expect(ios.package_name(ios_project)).toEqual('com.example.friendstring');
        });
    });

    describe('parseIOSProjectFiles method', function() {
        it('should throw if project is not an xcode project', function() {
            expect(function() {
                ios.parseIOSProjectFiles(temp);
            }).toThrow('does not appear to be an xcode project (no xcode project file)');
        });
        it('should throw if project does not contain an appropriate PhoneGap/Cordova.plist file or config.xml file', function() {
            shell.cp('-rf', ios_config_xml_project, temp);
            shell.rm(path.join(temp, 'SampleApp', 'config.xml'));

            expect(function() {
                ios.parseIOSProjectFiles(temp);
            }).toThrow('could not find PhoneGap/Cordova plist file, or config.xml file.');
        });
    });

    describe('installation', function() {
        describe('of <source-file> elements', function() {
            beforeEach(function() {
                shell.cp('-rf', ios_config_xml_project, temp);
            });

            it('should throw if source-file src cannot be found', function() {
                var source = copyArray(invalid_source);
                expect(function() {
                    ios['source-file'].install(source[1], faultyplugin, temp, faulty_id, proj_files);
                }).toThrow('cannot find "' + path.resolve(faultyplugin, 'src/ios/FaultyPluginCommand.m') + '" ios <source-file>');
            });
            it('should throw if source-file target already exists', function() {
                var source = copyArray(valid_source);
                var target = path.join(temp, 'SampleApp', 'Plugins', dummy_id, 'DummyPluginCommand.m');
                shell.mkdir('-p', path.dirname(target));
                fs.writeFileSync(target, 'some bs', 'utf-8');
                expect(function() {
                    ios['source-file'].install(source[0], dummyplugin, temp, dummy_id, proj_files);
                }).toThrow('target destination "' + target + '" already exists');
            });
            it('should call into xcodeproj\'s addSourceFile appropriately when element has no target-dir', function() {
                var source = copyArray(valid_source).filter(function(s) { return s.attrib['target-dir'] == undefined});
                var spy = spyOn(proj_files.xcode, 'addSourceFile');
                ios['source-file'].install(source[0], dummyplugin, temp, dummy_id, proj_files);
                expect(spy).toHaveBeenCalledWith(path.join('Plugins', dummy_id, 'DummyPluginCommand.m'), {});
            });
            it('should call into xcodeproj\'s addSourceFile appropriately when element has a target-dir', function() {
                var source = copyArray(valid_source).filter(function(s) { return s.attrib['target-dir'] != undefined});
                var spy = spyOn(proj_files.xcode, 'addSourceFile');
                ios['source-file'].install(source[0], dummyplugin, temp, dummy_id, proj_files);
                expect(spy).toHaveBeenCalledWith(path.join('Plugins', dummy_id, 'targetDir', 'TargetDirTest.m'), {});
            });
            it('should cp the file to the right target location when element has no target-dir', function() {
                var source = copyArray(valid_source).filter(function(s) { return s.attrib['target-dir'] == undefined});
                var spy = spyOn(shell, 'cp');
                ios['source-file'].install(source[0], dummyplugin, temp, dummy_id, proj_files);
                expect(spy).toHaveBeenCalledWith(path.join(dummyplugin, 'src', 'ios', 'DummyPluginCommand.m'), path.join(temp, 'SampleApp', 'Plugins', dummy_id, 'DummyPluginCommand.m'));
            });
            it('should cp the file to the right target location when element has a target-dir', function() {
                var source = copyArray(valid_source).filter(function(s) { return s.attrib['target-dir'] != undefined});
                var spy = spyOn(shell, 'cp');
                ios['source-file'].install(source[0], dummyplugin, temp, dummy_id, proj_files);
                expect(spy).toHaveBeenCalledWith(path.join(dummyplugin, 'src', 'ios', 'TargetDirTest.m'), path.join(temp, 'SampleApp', 'Plugins', dummy_id, 'targetDir', 'TargetDirTest.m'));
            });
            it('should call into xcodeproj\'s addFramework appropriately when element has framework=true set', function() {
                var source = copyArray(valid_source).filter(function(s) { return s.attrib['framework'] == "true"});
                spyOn(proj_files.xcode, 'addSourceFile');
                var spy = spyOn(proj_files.xcode, 'addFramework');
                ios['source-file'].install(source[0], dummyplugin, temp, dummy_id, proj_files);
                expect(spy).toHaveBeenCalledWith(path.join('SampleApp', 'Plugins', dummy_id, 'SourceWithFramework.m'), {weak:false});
            });
        });

        describe('of <header-file> elements', function() {
            beforeEach(function() {
                shell.cp('-rf', ios_config_xml_project, temp);
            });

            it('should throw if header-file src cannot be found', function() {
                var headers = copyArray(invalid_headers);
                expect(function() {
                    ios['header-file'].install(headers[1], faultyplugin, temp, faulty_id, proj_files);
                }).toThrow('cannot find "' + path.resolve(faultyplugin, 'src/ios/FaultyPluginCommand.h') + '" ios <header-file>');
            });
            it('should throw if header-file target already exists', function() {
                var headers = copyArray(valid_headers);
                var target = path.join(temp, 'SampleApp', 'Plugins', dummy_id, 'DummyPluginCommand.h');
                shell.mkdir('-p', path.dirname(target));
                fs.writeFileSync(target, 'some bs', 'utf-8');
                expect(function() {
                    ios['header-file'].install(headers[0], dummyplugin, temp, dummy_id, proj_files);
                }).toThrow('target destination "' + target + '" already exists');
            });
            it('should call into xcodeproj\'s addHeaderFile appropriately when element has no target-dir', function() {
                var headers = copyArray(valid_headers).filter(function(s) { return s.attrib['target-dir'] == undefined});
                var spy = spyOn(proj_files.xcode, 'addHeaderFile');
                ios['header-file'].install(headers[0], dummyplugin, temp, dummy_id,  proj_files);
                expect(spy).toHaveBeenCalledWith(path.join('Plugins', dummy_id, 'DummyPluginCommand.h'));
            });
            it('should call into xcodeproj\'s addHeaderFile appropriately when element a target-dir', function() {
                var headers = copyArray(valid_headers).filter(function(s) { return s.attrib['target-dir'] != undefined});
                var spy = spyOn(proj_files.xcode, 'addHeaderFile');
                ios['header-file'].install(headers[0], dummyplugin, temp, dummy_id, proj_files);
                expect(spy).toHaveBeenCalledWith(path.join('Plugins', dummy_id, 'targetDir', 'TargetDirTest.h'));
            });
            it('should cp the file to the right target location when element has no target-dir', function() {
                var headers = copyArray(valid_headers).filter(function(s) { return s.attrib['target-dir'] == undefined});
                var spy = spyOn(shell, 'cp');
                ios['header-file'].install(headers[0], dummyplugin, temp, dummy_id, proj_files);
                expect(spy).toHaveBeenCalledWith(path.join(dummyplugin, 'src', 'ios', 'DummyPluginCommand.h'), path.join(temp, 'SampleApp', 'Plugins', dummy_id, 'DummyPluginCommand.h'));
            });
            it('should cp the file to the right target location when element has a target-dir', function() {
                var headers = copyArray(valid_headers).filter(function(s) { return s.attrib['target-dir'] != undefined});
                var spy = spyOn(shell, 'cp');
                ios['header-file'].install(headers[0], dummyplugin, temp, dummy_id, proj_files);
                expect(spy).toHaveBeenCalledWith(path.join(dummyplugin, 'src', 'ios', 'TargetDirTest.h'), path.join(temp, 'SampleApp', 'Plugins', dummy_id, 'targetDir', 'TargetDirTest.h'));
            });
        });

        describe('of <resource-file> elements', function() {
            beforeEach(function() {
                shell.cp('-rf', ios_config_xml_project, temp);
            });
            it('should throw if resource-file src cannot be found', function() {
                var resources = copyArray(invalid_resources);
                expect(function() {
                    ios['resource-file'].install(resources[0], faultyplugin, temp, proj_files);
                }).toThrow('cannot find "' + path.resolve(faultyplugin, 'src/ios/IDontExist.bundle') + '" ios <resource-file>');
            });
            it('should throw if resource-file target already exists', function() {
                var resources = copyArray(valid_resources);
                var target = path.join(temp, 'SampleApp', 'Resources', 'DummyPlugin.bundle');
                shell.mkdir('-p', path.dirname(target));
                fs.writeFileSync(target, 'some bs', 'utf-8');
                expect(function() {
                    ios['resource-file'].install(resources[0], dummyplugin, temp, proj_files);
                }).toThrow('target destination "' + target + '" already exists');
            });
            it('should call into xcodeproj\'s addResourceFile', function() {
                var resources = copyArray(valid_resources);
                var spy = spyOn(proj_files.xcode, 'addResourceFile');
                ios['resource-file'].install(resources[0], dummyplugin, temp, proj_files);
                expect(spy).toHaveBeenCalledWith(path.join('Resources', 'DummyPlugin.bundle'));
            });
            it('should cp the file to the right target location', function() {
                var resources = copyArray(valid_resources);
                var spy = spyOn(shell, 'cp');
                ios['resource-file'].install(resources[0], dummyplugin, temp, proj_files);
                expect(spy).toHaveBeenCalledWith('-R', path.join(dummyplugin, 'src', 'ios', 'DummyPlugin.bundle'), path.join(temp, 'SampleApp', 'Resources'));
            });
        });
    });

    describe('uninstallation', function() {
        describe('of <source-file> elements', function() {
            it('should call into xcodeproj\'s removeSourceFile appropriately when element has no target-dir', function(){
                var source = copyArray(valid_source).filter(function(s) { return s.attrib['target-dir'] == undefined});
                shell.cp('-rf', ios_config_xml_project, temp);
                var spy = spyOn(proj_files.xcode, 'removeSourceFile');
                ios['source-file'].uninstall(source[0], temp, dummy_id, proj_files);
                expect(spy).toHaveBeenCalledWith(path.join('Plugins', dummy_id, 'DummyPluginCommand.m'));
            });
            it('should call into xcodeproj\'s removeSourceFile appropriately when element a target-dir', function(){
                var source = copyArray(valid_source).filter(function(s) { return s.attrib['target-dir'] != undefined});
                shell.cp('-rf', ios_config_xml_project, temp);
                var spy = spyOn(proj_files.xcode, 'removeSourceFile');
                ios['source-file'].uninstall(source[0], temp, dummy_id, proj_files);
                expect(spy).toHaveBeenCalledWith(path.join('Plugins', dummy_id, 'targetDir', 'TargetDirTest.m'));
            });
            it('should rm the file from the right target location when element has no target-dir', function(){
                var source = copyArray(valid_source).filter(function(s) { return s.attrib['target-dir'] == undefined});
                shell.cp('-rf', ios_config_xml_project, temp);
            
                var spy = spyOn(shell, 'rm');
                ios['source-file'].uninstall(source[0], temp, dummy_id, proj_files);
                expect(spy).toHaveBeenCalledWith('-rf', path.join(temp, 'SampleApp', 'Plugins', dummy_id, 'DummyPluginCommand.m'));
            });
            it('should rm the file from the right target location when element has a target-dir', function(){
                var source = copyArray(valid_source).filter(function(s) { return s.attrib['target-dir'] != undefined});
                shell.cp('-rf', ios_config_xml_project, temp);                
                var spy = spyOn(shell, 'rm');
                
                ios['source-file'].uninstall(source[0], temp, dummy_id, proj_files);
                expect(spy).toHaveBeenCalledWith('-rf', path.join(temp, 'SampleApp', 'Plugins', dummy_id, 'targetDir', 'TargetDirTest.m'));
            });
            it('should call into xcodeproj\'s removeFramework appropriately when element framework=true set', function(){
                var source = copyArray(valid_source).filter(function(s) { return s.attrib['framework'] == "true"});
                shell.cp('-rf', ios_config_xml_project, temp);
                var spy = spyOn(proj_files.xcode, 'removeFramework');
                
                ios['source-file'].uninstall(source[0], temp, dummy_id, proj_files);
                expect(spy).toHaveBeenCalledWith(path.join('SampleApp', 'Plugins', dummy_id, 'SourceWithFramework.m'));
            });
        });

        describe('of <header-file> elements', function() {
            beforeEach(function() {
                shell.cp('-rf', ios_config_xml_project, temp);
            });
            it('should call into xcodeproj\'s removeHeaderFile appropriately when element has no target-dir', function(){
                var headers = copyArray(valid_headers).filter(function(s) { return s.attrib['target-dir'] == undefined});
                var spy = spyOn(proj_files.xcode, 'removeHeaderFile');

                ios['header-file'].uninstall(headers[0], temp, dummy_id, proj_files);
                expect(spy).toHaveBeenCalledWith(path.join('Plugins', dummy_id, 'DummyPluginCommand.h'));
            });
            it('should call into xcodeproj\'s removeHeaderFile appropriately when element a target-dir', function(){
                var headers = copyArray(valid_headers).filter(function(s) { return s.attrib['target-dir'] != undefined});

                var spy = spyOn(proj_files.xcode, 'removeHeaderFile');

                ios['header-file'].uninstall(headers[0], temp, dummy_id, proj_files);
                expect(spy).toHaveBeenCalledWith(path.join('Plugins', dummy_id, 'targetDir', 'TargetDirTest.h'));
            });
            it('should rm the file from the right target location', function(){
                var headers = copyArray(valid_headers).filter(function(s) { return s.attrib['target-dir'] != undefined});
                var spy = spyOn(shell, 'rm');

                ios['header-file'].uninstall(headers[0], temp, dummy_id, proj_files);
                expect(spy).toHaveBeenCalledWith('-rf', path.join(temp, 'SampleApp', 'Plugins', dummy_id, 'targetDir', 'TargetDirTest.h'));
            });
        });

        describe('of <resource-file> elements', function() {
            beforeEach(function() {
                shell.cp('-rf', ios_config_xml_project, temp);
            });
            it('should call into xcodeproj\'s removeResourceFile', function(){
                var resources = copyArray(valid_resources);
                var spy = spyOn(proj_files.xcode, 'removeResourceFile');

                ios['resource-file'].uninstall(resources[0], temp, proj_files);
                expect(spy).toHaveBeenCalledWith(path.join('Resources', 'DummyPlugin.bundle'));
            });
            it('should rm the file from the right target location', function(){
                var resources = copyArray(valid_resources);
                var spy = spyOn(shell, 'rm');

                ios['resource-file'].uninstall(resources[0], temp, proj_files);
                expect(spy).toHaveBeenCalledWith('-rf', path.join(temp, 'SampleApp', 'Resources', 'DummyPlugin.bundle'));
            });
        });
    });
});
