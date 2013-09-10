var configChanges = require('../../src/util/config-changes'),
    xml_helpers = require('../../src/util/xml-helpers'),
    ios_parser = require('../../src/platforms/ios'),
    fs      = require('fs'),
    os      = require('osenv'),
    plugman = require('../../plugman'),
    et      = require('elementtree'),
    path    = require('path'),
    plist = require('plist'),
    shell   = require('shelljs'),
    temp    = path.join(os.tmpdir(), 'plugman'),
    dummyplugin = path.join(__dirname, '..', 'plugins', 'DummyPlugin'),
    cbplugin = path.join(__dirname, '..', 'plugins', 'ChildBrowser'),
    childrenplugin = path.join(__dirname, '..', 'plugins', 'multiple-children'),
    shareddepsplugin = path.join(__dirname, '..', 'plugins', 'shared-deps-multi-child'),
    configplugin = path.join(__dirname, '..', 'plugins', 'ConfigTestPlugin'),
    varplugin = path.join(__dirname, '..', 'plugins', 'VariablePlugin'),
    android_two_project = path.join(__dirname, '..', 'projects', 'android_two', '*'),
    android_two_no_perms_project = path.join(__dirname, '..', 'projects', 'android_two_no_perms', '*'),
    ios_plist_project = path.join(__dirname, '..', 'projects', 'ios-plist', '*'),
    ios_config_xml = path.join(__dirname, '..', 'projects', 'ios-config-xml', '*'),
    plugins_dir = path.join(temp, 'cordova', 'plugins');

// TODO: dont do fs so much

var dummy_xml = new et.ElementTree(et.XML(fs.readFileSync(path.join(dummyplugin, 'plugin.xml'), 'utf-8')));

function innerXML(xmltext) {
    return xmltext.replace(/^<[\w\s\-=\/"\.]+>/, '').replace(/<\/[\w\s\-=\/"\.]+>$/,'');
}

describe('config-changes module', function() {
    beforeEach(function() {
        shell.mkdir('-p', temp);
        shell.mkdir('-p', plugins_dir);
    });
    afterEach(function() {
        shell.rm('-rf', temp);
    });

    describe('queue methods', function() {
        describe('add_installed_plugin_to_prepare_queue', function() {
            it('should call get_platform_json method', function() {
                var spy = spyOn(configChanges, 'get_platform_json').andReturn({
                    prepare_queue:{
                        installed:[],
                        uninstalled:[]
                    }
                });
                configChanges.add_installed_plugin_to_prepare_queue(plugins_dir, 'PooPlugin', 'android', {});
                expect(spy).toHaveBeenCalledWith(plugins_dir, 'android');
            });
            it('should append specified plugin to platform.json', function() {
                configChanges.add_installed_plugin_to_prepare_queue(plugins_dir, 'PooPlugin', 'android', {});
                var json = configChanges.get_platform_json(plugins_dir, 'android');
                expect(json.prepare_queue.installed[0].plugin).toEqual('PooPlugin');
                expect(json.prepare_queue.installed[0].vars).toEqual({});
            });
            it('should append specified plugin with any variables to platform.json', function() {
                configChanges.add_installed_plugin_to_prepare_queue(plugins_dir, 'PooPlugin', 'android', {'dude':'man'});
                var json = configChanges.get_platform_json(plugins_dir, 'android');
                expect(json.prepare_queue.installed[0].plugin).toEqual('PooPlugin');
                expect(json.prepare_queue.installed[0].vars).toEqual({'dude':'man'});
            });
            it('should call save_platform_json with updated config', function() {
                var spy = spyOn(configChanges, 'save_platform_json');
                configChanges.add_installed_plugin_to_prepare_queue(plugins_dir, 'PooPlugin', 'android', {});
                var config = spy.mostRecentCall.args[0];
                expect(config.prepare_queue.installed[0].plugin).toEqual('PooPlugin');
            });
        });
        
        describe('add_uninstalled_plugin_to_prepare_queue', function() {
            beforeEach(function() {
                shell.cp('-rf', dummyplugin, plugins_dir);
            });

            it('should call get_platform_json method', function() {
                var spy = spyOn(configChanges, 'get_platform_json').andReturn({
                    prepare_queue:{
                        installed:[],
                        uninstalled:[]
                    }
                });
                configChanges.add_uninstalled_plugin_to_prepare_queue(plugins_dir, 'DummyPlugin', 'android');
                expect(spy).toHaveBeenCalledWith(plugins_dir, 'android');
            });
            it('should append specified plugin to platform.json', function() {
                configChanges.add_uninstalled_plugin_to_prepare_queue(plugins_dir, 'DummyPlugin', 'android');
                var json = configChanges.get_platform_json(plugins_dir, 'android');
                expect(json.prepare_queue.uninstalled[0].plugin).toEqual('DummyPlugin');
                expect(json.prepare_queue.uninstalled[0].id).toEqual('com.phonegap.plugins.dummyplugin');
            });
            it('should call save_platform_json with updated config', function() {
                var spy = spyOn(configChanges, 'save_platform_json');
                configChanges.add_uninstalled_plugin_to_prepare_queue(plugins_dir, 'DummyPlugin', 'android', {});
                var config = spy.mostRecentCall.args[0];
                expect(config.prepare_queue.uninstalled[0].plugin).toEqual('DummyPlugin');
                expect(config.prepare_queue.uninstalled[0].id).toEqual('com.phonegap.plugins.dummyplugin');
            });
        });
    });

    describe('get_platform_json method', function() {
        it('should write out and return an empty config json file if it doesn\'t exist', function() {
            var filepath = path.join(plugins_dir, 'android.json');
            var cfg = configChanges.get_platform_json(plugins_dir, 'android');
            expect(cfg).toBeDefined();
            expect(cfg.prepare_queue).toBeDefined();
            expect(cfg.config_munge).toBeDefined();
            expect(cfg.installed_plugins).toBeDefined();
            expect(fs.existsSync(filepath)).toBe(true);
            expect(fs.readFileSync(filepath, 'utf-8')).toEqual(JSON.stringify(cfg));
        });
        it('should return the json file if it exists', function() {
            var filepath = path.join(plugins_dir, 'android.json');
            var json = {prepare_queue:{installed:[],uninstalled:[]},config_munge:{somechange:"blah"},installed_plugins:{}};
            fs.writeFileSync(filepath, JSON.stringify(json), 'utf-8');
            var cfg = configChanges.get_platform_json(plugins_dir, 'android');
            expect(JSON.stringify(json)).toEqual(JSON.stringify(cfg));
        });
    });

    describe('save_platform_json method', function() {
        it('should write out specified json', function() {
            var filepath = path.join(plugins_dir, 'android.json');
            var cfg = {poop:true};
            configChanges.save_platform_json(cfg, plugins_dir, 'android');
            expect(fs.existsSync(filepath)).toBe(true);
            expect(fs.readFileSync(filepath, 'utf-8')).toEqual(JSON.stringify(cfg));
        });
    });

    describe('generate_plugin_config_munge method', function() {
        describe('for android projects', function() {
            beforeEach(function() {
                shell.cp('-rf', android_two_project, temp);
            });
            it('should return a flat config heirarchy for simple, one-off config changes', function() {
                var xml;
                var munge = configChanges.generate_plugin_config_munge(dummyplugin, 'android', temp, {});
                expect(munge['AndroidManifest.xml']).toBeDefined();
                expect(munge['AndroidManifest.xml']['/manifest/application']).toBeDefined();
                xml = (new et.ElementTree(dummy_xml.find('./platform[@name="android"]/config-file[@target="AndroidManifest.xml"]'))).write({xml_declaration:false});
                xml = innerXML(xml);
                expect(munge['AndroidManifest.xml']['/manifest/application'][xml]).toEqual(1);
                expect(munge['res/xml/plugins.xml']).toBeDefined();
                expect(munge['res/xml/plugins.xml']['/plugins']).toBeDefined();
                xml = (new et.ElementTree(dummy_xml.find('./platform[@name="android"]/config-file[@target="res/xml/plugins.xml"]'))).write({xml_declaration:false});
                xml = innerXML(xml);
                expect(munge['res/xml/plugins.xml']['/plugins'][xml]).toEqual(1);
                expect(munge['res/xml/config.xml']).toBeDefined();
                expect(munge['res/xml/config.xml']['/cordova/plugins']).toBeDefined();
                xml = (new et.ElementTree(dummy_xml.find('./platform[@name="android"]/config-file[@target="res/xml/config.xml"]'))).write({xml_declaration:false});
                xml = innerXML(xml);
                expect(munge['res/xml/config.xml']['/cordova/plugins'][xml]).toEqual(1);
            });
            it('should split out multiple children of config-file elements into individual leaves', function() {
                var munge = configChanges.generate_plugin_config_munge(childrenplugin, 'android', temp, {});
                expect(munge['AndroidManifest.xml']).toBeDefined();
                expect(munge['AndroidManifest.xml']['/manifest']).toBeDefined();
                expect(munge['AndroidManifest.xml']['/manifest']['<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />']).toBeDefined();
                expect(munge['AndroidManifest.xml']['/manifest']['<uses-permission android:name="android.permission.READ_PHONE_STATE" />']).toBeDefined();
                expect(munge['AndroidManifest.xml']['/manifest']['<uses-permission android:name="android.permission.INTERNET" />']).toBeDefined();
                expect(munge['AndroidManifest.xml']['/manifest']['<uses-permission android:name="android.permission.GET_ACCOUNTS" />']).toBeDefined();
                expect(munge['AndroidManifest.xml']['/manifest']['<uses-permission android:name="android.permission.WAKE_LOCK" />']).toBeDefined();
                expect(munge['AndroidManifest.xml']['/manifest']['<permission android:name="com.alunny.childapp.permission.C2D_MESSAGE" android:protectionLevel="signature" />']).toBeDefined();
                expect(munge['AndroidManifest.xml']['/manifest']['<uses-permission android:name="com.alunny.childapp.permission.C2D_MESSAGE" />']).toBeDefined();
                expect(munge['AndroidManifest.xml']['/manifest']['<uses-permission android:name="com.google.android.c2dm.permission.RECEIVE" />']).toBeDefined();
            });
            it('should not use xml comments as config munge leaves', function() {
                var munge = configChanges.generate_plugin_config_munge(childrenplugin, 'android', temp, {});
                expect(munge['AndroidManifest.xml']['/manifest']['<!--library-->']).not.toBeDefined();
                expect(munge['AndroidManifest.xml']['/manifest']['<!-- GCM connects to Google Services. -->']).not.toBeDefined();
            });
            it('should increment config heirarchy leaves if dfferent config-file elements target the same file + selector + xml', function() {
                var munge = configChanges.generate_plugin_config_munge(configplugin, 'android', temp, {});
                expect(munge['res/xml/config.xml']['/widget']['<poop />']).toEqual(2);
            });
            it('should take into account interpolation variables', function() {
                var munge = configChanges.generate_plugin_config_munge(childrenplugin, 'android', temp, {PACKAGE_NAME:'ca.filmaj.plugins'});
                expect(munge['AndroidManifest.xml']['/manifest']['<uses-permission android:name="ca.filmaj.plugins.permission.C2D_MESSAGE" />']).toBeDefined();
            });
            it('should create munges for platform-agnostic config.xml changes', function() {
                var munge = configChanges.generate_plugin_config_munge(dummyplugin, 'android', temp, {});
                expect(munge['config.xml']['/*']['<access origin="build.phonegap.com" />']).toBeDefined();
                expect(munge['config.xml']['/*']['<access origin="s3.amazonaws.com" />']).toBeDefined();
            });
            it('should automatically add on app java identifier as PACKAGE_NAME variable for android config munges', function() {
                shell.cp('-rf', android_two_project, temp);
                var munge = configChanges.generate_plugin_config_munge(varplugin, 'android', temp, {});
                var expected_xml = '<package>com.alunny.childapp</package>';
                expect(munge['AndroidManifest.xml']['/manifest'][expected_xml]).toBeDefined();
            });
        });

        describe('for ios projects', function() {
            beforeEach(function() {
                shell.cp('-rf', ios_config_xml, temp);
            });
            it('should automatically add on ios bundle identifier as PACKAGE_NAME variable for ios config munges', function() {
                var munge = configChanges.generate_plugin_config_munge(varplugin, 'ios', temp, {});
                var expected_xml = '<cfbundleid>com.example.friendstring</cfbundleid>';
                expect(munge['config.xml']['/widget'][expected_xml]).toBeDefined();
            });
            it('should special case plugins-plist elements into own property', function() {
                var munge = configChanges.generate_plugin_config_munge(dummyplugin, 'ios', temp, {});
                expect(munge['plugins-plist']).toBeDefined();
                expect(munge['plugins-plist']['com.phonegap.plugins.dummyplugin']).toEqual('DummyPluginCommand');
            });
            it('should special case framework elements for ios', function() {
                var munge = configChanges.generate_plugin_config_munge(cbplugin, 'ios', temp, {});
                expect(munge['framework']).toBeDefined();
                expect(munge['framework']['libsqlite3.dylib']['false']).toBeDefined();
                expect(munge['framework']['social.framework']['true']).toBeDefined();
                expect(munge['framework']['music.framework']['false']).toBeDefined();
            });
        });
    });

    describe('processing of plugins (via process method)', function() {
        beforeEach(function() {
            shell.cp('-rf', dummyplugin, plugins_dir);
        });
        it('should generate config munges for queued plugins', function() {
            shell.cp('-rf', android_two_project, temp);
            var cfg = configChanges.get_platform_json(plugins_dir, 'android');
            cfg.prepare_queue.installed = [{'plugin':'DummyPlugin', 'vars':{}}];
            configChanges.save_platform_json(cfg, plugins_dir, 'android');
            var spy = spyOn(configChanges, 'generate_plugin_config_munge').andReturn({});
            configChanges.process(plugins_dir, temp, 'android');
            expect(spy).toHaveBeenCalledWith(path.join(plugins_dir, 'DummyPlugin'), 'android', temp, {});
        });
        it('should get a reference to existing config munge by calling get_platform_json', function() {
            shell.cp('-rf', android_two_project, temp);
            var spy = spyOn(configChanges, 'get_platform_json').andReturn({
                prepare_queue:{
                    installed:[],
                    uninstalled:[]
                },
                config_munge:{}
            });
            configChanges.process(plugins_dir, temp, 'android');
            expect(spy).toHaveBeenCalledWith(plugins_dir, 'android');
        });
        describe(': installation', function() {
            describe('of xml config files', function() {
                beforeEach(function() {
                    shell.cp('-rf', android_two_project, temp);
                });
                it('should call graftXML for every new config munge it introduces (every leaf in config munge that does not exist)', function() {
                    var cfg = configChanges.get_platform_json(plugins_dir, 'android');
                    cfg.prepare_queue.installed = [{'plugin':'DummyPlugin', 'vars':{}}];
                    configChanges.save_platform_json(cfg, plugins_dir, 'android');

                    var spy = spyOn(xml_helpers, 'graftXML').andReturn(true);

                    var manifest_doc = new et.ElementTree(et.XML(fs.readFileSync(path.join(temp, 'AndroidManifest.xml'), 'utf-8')));
                    var munge = dummy_xml.find('./platform[@name="android"]/config-file[@target="AndroidManifest.xml"]');
                    configChanges.process(plugins_dir, temp, 'android');
                    expect(spy.calls.length).toEqual(4);
                    expect(spy.argsForCall[0][2]).toEqual('/*');
                    expect(spy.argsForCall[1][2]).toEqual('/*');
                    expect(spy.argsForCall[2][2]).toEqual('/manifest/application');
                    expect(spy.argsForCall[3][2]).toEqual('/cordova/plugins');
                });
                it('should not call graftXML for a config munge that already exists from another plugin', function() {
                    shell.cp('-rf', configplugin, plugins_dir);
                    configChanges.add_installed_plugin_to_prepare_queue(plugins_dir, 'ConfigTestPlugin', 'android', {});

                    var spy = spyOn(xml_helpers, 'graftXML').andReturn(true);
                    configChanges.process(plugins_dir, temp, 'android');
                    expect(spy.calls.length).toEqual(1);
                });
                it('should not call graftXML for a config munge targeting a config file that does not exist', function() {
                    configChanges.add_installed_plugin_to_prepare_queue(plugins_dir, 'DummyPlugin', 'android', {});

                    var spy = spyOn(fs, 'readFileSync').andCallThrough();

                    configChanges.process(plugins_dir, temp, 'android');
                    expect(spy).not.toHaveBeenCalledWith(path.join(temp, 'res', 'xml', 'plugins.xml'), 'utf-8');
                });
            });
            describe('of pbxproject framework files', function() {
                var xcode_add, xcode_rm;
                beforeEach(function() {
                    shell.cp('-rf', ios_config_xml, temp);
                    shell.cp('-rf', cbplugin, plugins_dir);
                    xcode_add = jasmine.createSpy();
                    xcode_rm = jasmine.createSpy();
                    spyOn(ios_parser, 'parseIOSProjectFiles').andReturn({
                        xcode:{
                            addFramework:xcode_add,
                            removeFramework:xcode_rm,
                            writeSync:function(){}
                        },
                        pbx:path.join(temp, 'pbxpath')
                    });
                });
                it('should call into xcode.addFramework if plugin has <framework> file defined and is ios',function() {
                    configChanges.add_installed_plugin_to_prepare_queue(plugins_dir, 'ChildBrowser', 'ios', {});
                    configChanges.process(plugins_dir, temp, 'ios');
                    expect(xcode_add).toHaveBeenCalledWith('libsqlite3.dylib', {weak:false});
                    expect(xcode_add).toHaveBeenCalledWith('social.framework', {weak:true});
                    expect(xcode_add).toHaveBeenCalledWith('music.framework', {weak:false});
                });
            });
            describe('of <plugins-plist> elements', function() {
                it('should only be used in an applicably old cordova-ios projects', function() {
                    shell.cp('-rf', ios_plist_project, temp);
                    shell.cp('-rf', dummyplugin, plugins_dir);
                    var cfg = configChanges.get_platform_json(plugins_dir, 'ios');
                    cfg.prepare_queue.installed = [{'plugin':'DummyPlugin', 'vars':{}}];
                    configChanges.save_platform_json(cfg, plugins_dir, 'ios');

                    var spy = spyOn(plist, 'parseFileSync').andReturn({Plugins:{}});
                    configChanges.process(plugins_dir, temp, 'ios');
                    expect(spy).toHaveBeenCalledWith(path.join(temp, 'SampleApp', 'PhoneGap.plist').replace(/\\/g, '/'));
                });
                it('should provide a deprecation warning message when used', function() {
                    shell.cp('-rf', ios_plist_project, temp);
                    shell.cp('-rf', dummyplugin, plugins_dir);
                    var cfg = configChanges.get_platform_json(plugins_dir, 'ios');
                    cfg.prepare_queue.installed = [{'plugin':'DummyPlugin', 'vars':{}}];
                    configChanges.save_platform_json(cfg, plugins_dir, 'ios');

                    spyOn(plist, 'parseFileSync').andReturn({Plugins:{}});
                    var spy = spyOn(plugman, 'emit');
                    configChanges.process(plugins_dir, temp, 'ios');
                    expect(spy).toHaveBeenCalledWith('warn', 'DEPRECATION WARNING: Plugin "com.phonegap.plugins.dummyplugin" uses <plugins-plist> element(s), which are now deprecated. Support will be removed in Cordova 3.4.');
                });
            });
            it('should resolve wildcard config-file targets to the project, if applicable', function() {
                shell.cp('-rf', ios_config_xml, temp);
                shell.cp('-rf', cbplugin, plugins_dir);
                configChanges.add_installed_plugin_to_prepare_queue(plugins_dir, 'ChildBrowser', 'ios', {});
                var spy = spyOn(fs, 'readFileSync').andCallThrough();

                configChanges.process(plugins_dir, temp, 'ios');
                expect(spy).toHaveBeenCalledWith(path.join(temp, 'SampleApp', 'SampleApp-Info.plist').replace(/\\/g, '/'), 'utf8');
            });
            it('should move successfully installed plugins from queue to installed plugins section, and include/retain vars if applicable', function() {
                shell.cp('-rf', android_two_project, temp);
                shell.cp('-rf', varplugin, plugins_dir);
                configChanges.add_installed_plugin_to_prepare_queue(plugins_dir, 'VariablePlugin', 'android', {"API_KEY":"hi"}, true);

                configChanges.process(plugins_dir, temp, 'android');

                cfg = configChanges.get_platform_json(plugins_dir, 'android');
                expect(cfg.prepare_queue.installed.length).toEqual(0);
                expect(cfg.installed_plugins['com.adobe.vars']).toBeDefined();
                expect(cfg.installed_plugins['com.adobe.vars']['API_KEY']).toEqual('hi');
            });
            it('should save changes to global config munge after completing an install', function() {
                shell.cp('-rf', android_two_project, temp);
                shell.cp('-rf', varplugin, plugins_dir);
                configChanges.add_installed_plugin_to_prepare_queue(plugins_dir, 'VariablePlugin', 'android', {"API_KEY":"hi"});

                var spy = spyOn(configChanges, 'save_platform_json');
                configChanges.process(plugins_dir, temp, 'android');
                expect(spy).toHaveBeenCalled();
            });
        });

        describe(': uninstallation', function() {
            it('should call pruneXML for every config munge it completely removes from the app (every leaf that is decremented to 0)', function() {
                shell.cp('-rf', android_two_project, temp);
                // Run through an "install"
                configChanges.add_installed_plugin_to_prepare_queue(plugins_dir, 'DummyPlugin', 'android', {});
                configChanges.process(plugins_dir, temp, 'android');

                // Now set up an uninstall and make sure prunexml is called properly
                configChanges.add_uninstalled_plugin_to_prepare_queue(plugins_dir, 'DummyPlugin', 'android');
                var spy = spyOn(xml_helpers, 'pruneXML').andReturn(true);
                configChanges.process(plugins_dir, temp, 'android');
                expect(spy.calls.length).toEqual(4);
                expect(spy.argsForCall[0][2]).toEqual('/*');
                expect(spy.argsForCall[1][2]).toEqual('/*');
                expect(spy.argsForCall[2][2]).toEqual('/manifest/application');
                expect(spy.argsForCall[3][2]).toEqual('/cordova/plugins');
            });
            it('should generate a config munge that interpolates variables into config changes, if applicable', function() {
                shell.cp('-rf', android_two_project, temp);
                shell.cp('-rf', varplugin, plugins_dir);
                // Run through an "install"
                configChanges.add_installed_plugin_to_prepare_queue(plugins_dir, 'VariablePlugin', 'android', {"API_KEY":"canucks"});
                configChanges.process(plugins_dir, temp, 'android');

                // Now set up an uninstall and make sure prunexml is called properly
                configChanges.add_uninstalled_plugin_to_prepare_queue(plugins_dir, 'VariablePlugin', 'android');
                var spy = spyOn(configChanges, 'generate_plugin_config_munge').andReturn({});
                configChanges.process(plugins_dir, temp, 'android');
                var munge_params = spy.mostRecentCall.args;
                expect(munge_params[0]).toEqual(path.join(plugins_dir, 'VariablePlugin'));
                expect(munge_params[1]).toEqual('android');
                expect(munge_params[2]).toEqual(temp);
                expect(munge_params[3]['API_KEY']).toEqual('canucks');
            });
            it('should not call pruneXML for a config munge that another plugin depends on', function() {
                shell.cp('-rf', android_two_no_perms_project, temp);
                shell.cp('-rf', childrenplugin, plugins_dir);
                shell.cp('-rf', shareddepsplugin, plugins_dir);

                // Run through and "install" two plugins (they share a permission for INTERNET)
                configChanges.add_installed_plugin_to_prepare_queue(plugins_dir, 'multiple-children', 'android', {});
                configChanges.add_installed_plugin_to_prepare_queue(plugins_dir, 'shared-deps-multi-child', 'android', {});
                configChanges.process(plugins_dir, temp, 'android');

                // Now set up an uninstall for multi-child plugin
                configChanges.add_uninstalled_plugin_to_prepare_queue(plugins_dir, 'multiple-children', 'android');
                configChanges.process(plugins_dir, temp, 'android');
                var am_xml = new et.ElementTree(et.XML(fs.readFileSync(path.join(temp, 'AndroidManifest.xml'), 'utf-8')));
                var permission = am_xml.find('./uses-permission');
                expect(permission).toBeDefined();
                expect(permission.attrib['android:name']).toEqual('android.permission.INTERNET');
            });
            it('should not call pruneXML for a config munge targeting a config file that does not exist', function() {
                shell.cp('-rf', android_two_project, temp);
                // install a plugin
                configChanges.add_installed_plugin_to_prepare_queue(plugins_dir, 'DummyPlugin', 'android', {});
                configChanges.process(plugins_dir, temp, 'android');
                // set up an uninstall for the same plugin
                configChanges.add_uninstalled_plugin_to_prepare_queue(plugins_dir, 'DummyPlugin', 'android', {});

                var spy = spyOn(fs, 'readFileSync').andCallThrough();
                configChanges.process(plugins_dir, temp, 'android');

                expect(spy).not.toHaveBeenCalledWith(path.join(temp, 'res', 'xml', 'plugins.xml'), 'utf-8');
            });
            it('should remove uninstalled plugins from installed plugins list', function() {
                shell.cp('-rf', android_two_project, temp);
                shell.cp('-rf', varplugin, plugins_dir);
                // install the var plugin
                configChanges.add_installed_plugin_to_prepare_queue(plugins_dir, 'VariablePlugin', 'android', {"API_KEY":"eat my shorts"});
                configChanges.process(plugins_dir, temp, 'android');
                // queue up an uninstall for the same plugin
                configChanges.add_uninstalled_plugin_to_prepare_queue(plugins_dir, 'VariablePlugin', 'android');
                configChanges.process(plugins_dir, temp, 'android');

                var cfg = configChanges.get_platform_json(plugins_dir, 'android');
                expect(cfg.prepare_queue.uninstalled.length).toEqual(0);
                expect(cfg.installed_plugins['com.adobe.vars']).not.toBeDefined();
            });
            it('should only parse + remove plist plugin entries in applicably old ios projects', function() {
                shell.cp('-rf', ios_plist_project, temp);
                // install plugin
                configChanges.add_installed_plugin_to_prepare_queue(plugins_dir, 'DummyPlugin', 'ios', {});
                configChanges.process(plugins_dir, temp, 'ios');
                // set up an uninstall
                configChanges.add_uninstalled_plugin_to_prepare_queue(plugins_dir, 'DummyPlugin', 'ios');

                var spy = spyOn(plist, 'parseFileSync').andReturn({Plugins:{}});
                configChanges.process(plugins_dir, temp, 'ios');
                expect(spy).toHaveBeenCalledWith(path.join(temp, 'SampleApp', 'PhoneGap.plist').replace(/\\/g, '/'));
            });
            it('should provide a deprecation warning message when used', function() {
                shell.cp('-rf', ios_plist_project, temp);
                // install plugin
                configChanges.add_installed_plugin_to_prepare_queue(plugins_dir, 'DummyPlugin', 'ios', {});
                configChanges.process(plugins_dir, temp, 'ios');
                // set up an uninstall
                configChanges.add_uninstalled_plugin_to_prepare_queue(plugins_dir, 'DummyPlugin', 'ios');

                spyOn(plist, 'parseFileSync').andReturn({Plugins:{}});
                var spy = spyOn(plugman, 'emit');
                configChanges.process(plugins_dir, temp, 'ios');
                expect(spy).toHaveBeenCalledWith('warn', 'DEPRECATION WARNING: Plugin "com.phonegap.plugins.dummyplugin" uses <plugins-plist> element(s), which are now deprecated. Support will be removed in Cordova 3.4.');
            });
            it('should save changes to global config munge after completing an uninstall', function() {
                shell.cp('-rf', android_two_project, temp);
                shell.cp('-rf', varplugin, plugins_dir);
                // install a plugin
                configChanges.add_installed_plugin_to_prepare_queue(plugins_dir, 'VariablePlugin', 'android', {"API_KEY":"eat my shorts"});
                configChanges.process(plugins_dir, temp, 'android');
                // set up an uninstall for the plugin
                configChanges.add_uninstalled_plugin_to_prepare_queue(plugins_dir, 'VariablePlugin', 'android');

                var spy = spyOn(configChanges, 'save_platform_json');
                configChanges.process(plugins_dir, temp, 'android');
                expect(spy).toHaveBeenCalled();
            });
        });
    });
});
