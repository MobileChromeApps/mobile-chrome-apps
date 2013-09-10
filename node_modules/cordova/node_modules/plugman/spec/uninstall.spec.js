var uninstall = require('../src/uninstall'),
    actions = require('../src/util/action-stack'),
    config_changes = require('../src/util/config-changes'),
    dependencies = require('../src/util/dependencies'),
    xml_helpers = require('../src/util/xml-helpers'),
    plugman = require('../plugman'),
    fs      = require('fs'),
    os      = require('osenv'),
    path    = require('path'),
    shell   = require('shelljs'),
    semver  = require('semver'),
    temp    = __dirname,
    dummyplugin = 'DummyPlugin',
    dummy_id = 'com.phonegap.plugins.dummyplugin',
    variableplugin = 'VariablePlugin',
    engineplugin = 'EnginePlugin',
    plugins_dir = path.join(temp, 'plugins');

describe('uninstallPlatform', function() {
    var exists, get_json, chmod, exec, proc, add_to_queue, prepare, actions_push, c_a, rm;
    var gen_deps, get_chain;
    beforeEach(function() {
        proc = spyOn(actions.prototype, 'process').andCallFake(function(platform, proj, cb) {
            cb();
        });
        actions_push = spyOn(actions.prototype, 'push');
        c_a = spyOn(actions.prototype, 'createAction');
        prepare = spyOn(plugman, 'prepare');
        exec = spyOn(shell, 'exec').andReturn({code:1});
        chmod = spyOn(fs, 'chmodSync');
        exists = spyOn(fs, 'existsSync').andReturn(true);
        get_json = spyOn(config_changes, 'get_platform_json').andReturn({
            installed_plugins:{},
            dependent_plugins:{}
        });
        rm = spyOn(shell, 'rm');
        add_to_queue = spyOn(config_changes, 'add_uninstalled_plugin_to_prepare_queue');
        dependents = jasmine.createSpy('getChain').andReturn([]),
        gen_deps = spyOn(dependencies, 'generate_dependency_info').andReturn({
            graph:{
                getChain:dependents
            },
            top_level_plugins:[]
        });
    });
    describe('success', function() {
        it('should call prepare after a successful uninstall', function() {
            uninstall.uninstallPlatform('android', temp, dummyplugin, plugins_dir, {});
            expect(prepare).toHaveBeenCalled();
        });
        it('should call the config-changes module\'s add_uninstalled_plugin_to_prepare_queue method after processing an install', function() {
            uninstall.uninstallPlatform('android', temp, dummyplugin, plugins_dir, {});
            expect(add_to_queue).toHaveBeenCalledWith(plugins_dir, 'DummyPlugin', 'android', true);
        });
        it('should queue up actions as appropriate for that plugin and call process on the action stack', function() {
            uninstall.uninstallPlatform('android', temp, dummyplugin, plugins_dir, {});
            expect(actions_push.calls.length).toEqual(4);
            expect(c_a).toHaveBeenCalledWith(jasmine.any(Function), [jasmine.any(Object), temp, dummy_id], jasmine.any(Function), [jasmine.any(Object), path.join(plugins_dir, dummyplugin), temp, dummy_id]);
            expect(proc).toHaveBeenCalled();
        });

        describe('with dependencies', function() {
            var parseET, emit;
            beforeEach(function() {
                emit = spyOn(plugman, 'emit');
                parseET = spyOn(xml_helpers, 'parseElementtreeSync').andReturn({
                    _root:{
                        attrib:{}
                    },
                    find:function() { return null },
                    findall:function() { return [] }
                });
            });
            it('should uninstall "dangling" dependencies', function() {
                // TODO: this is a terrible way to do conditional mocking, i am sorry.
                // if you have a better idea on how to mock out this recursive function, plz patch it
                var counter = 0;
                gen_deps.andCallFake(function() {
                    var obj;
                    if (counter === 0) {
                        counter++;
                        obj = {
                            graph:{
                                getChain:function() { return ['one','two'] }
                            },
                            top_level_plugins:[]
                        };
                    } else {
                        obj = {
                            graph:{
                                getChain:dependents
                            },
                            top_level_plugins:[]
                        };
                    }
                    return obj;
                });
                uninstall.uninstallPlatform('android', temp, dummyplugin, plugins_dir, {});
                expect(emit).toHaveBeenCalledWith('log', 'Uninstalling 2 dangling dependent plugins...');
            });
            it('should not uninstall any dependencies that are relied on by other plugins');
        });
    });

    describe('failure', function() {
        it('should throw if platform is unrecognized', function() {
            expect(function() {
                uninstall.uninstallPlatform('atari', temp, 'SomePlugin', plugins_dir, {});
            }).toThrow('atari not supported.');
        });
        it('should throw if plugin is missing', function() {
            exists.andReturn(false);
            expect(function() {
                uninstall.uninstallPlatform('android', temp, 'SomePluginThatDoesntExist', plugins_dir, {});
            }).toThrow('Plugin "SomePluginThatDoesntExist" not found. Already uninstalled?');
        });
    });
});

describe('uninstallPlugin', function() {
    var exists, get_json, chmod, exec, proc, add_to_queue, prepare, actions_push, c_a, rm, uninstall_plugin;
    beforeEach(function() {
        uninstall_plugin = spyOn(uninstall, 'uninstallPlugin').andCallThrough();
        proc = spyOn(actions.prototype, 'process').andCallFake(function(platform, proj, cb) {
            cb();
        });
        actions_push = spyOn(actions.prototype, 'push');
        c_a = spyOn(actions.prototype, 'createAction');
        prepare = spyOn(plugman, 'prepare');
        exec = spyOn(shell, 'exec').andReturn({code:1});
        chmod = spyOn(fs, 'chmodSync');
        exists = spyOn(fs, 'existsSync').andReturn(true);
        get_json = spyOn(config_changes, 'get_platform_json').andReturn({
            installed_plugins:{},
            dependent_plugins:{}
        });
        rm = spyOn(shell, 'rm');
        add_to_queue = spyOn(config_changes, 'add_uninstalled_plugin_to_prepare_queue');
    });
    describe('success', function() {
        it('should remove the plugin directory', function() {
            uninstall.uninstallPlugin(dummyplugin, plugins_dir);
            expect(rm).toHaveBeenCalled();
        });
        describe('with dependencies', function() {
            var parseET, emit;
            beforeEach(function() {
                emit = spyOn(plugman, 'emit');
                var counter = 0;
                parseET = spyOn(xml_helpers, 'parseElementtreeSync').andCallFake(function(p) {
                    return {
                        _root:{
                            attrib:{}
                        },
                        find:function() { return null },
                        findall:function() { 
                            if (counter === 0) {
                                counter++;
                                return [{attrib:{id:'somedependent'}}] 
                            }
                            else return [];
                        }
                    }
                });
            });
            it('should recurse if dependent plugins are detected', function() {
                uninstall.uninstallPlugin(dummyplugin, plugins_dir);
                expect(uninstall_plugin).toHaveBeenCalledWith('somedependent', plugins_dir, jasmine.any(Function));
            });
        });
    });

    describe('failure', function() {
        it('should throw if plugin is missing', function() {
            exists.andReturn(false);
            expect(function() {
                uninstall('android', temp, 'SomePluginThatDoesntExist', plugins_dir, {});
            }).toThrow('Plugin "SomePluginThatDoesntExist" not found. Already uninstalled?');
        });
    });
});

describe('uninstall', function() {
    var exists, get_json, chmod, exec, proc, add_to_queue, prepare, actions_push, c_a, rm;
    beforeEach(function() {
        proc = spyOn(actions.prototype, 'process').andCallFake(function(platform, proj, cb) {
            cb();
        });
        actions_push = spyOn(actions.prototype, 'push');
        c_a = spyOn(actions.prototype, 'createAction');
        prepare = spyOn(plugman, 'prepare');
        exec = spyOn(shell, 'exec').andReturn({code:1});
        chmod = spyOn(fs, 'chmodSync');
        exists = spyOn(fs, 'existsSync').andReturn(true);
        get_json = spyOn(config_changes, 'get_platform_json').andReturn({
            installed_plugins:{},
            dependent_plugins:{}
        });
        rm = spyOn(shell, 'rm');
        add_to_queue = spyOn(config_changes, 'add_uninstalled_plugin_to_prepare_queue');
    });
    describe('success', function() {
        it('should call prepare after a successful uninstall', function() {
            uninstall('android', temp, dummyplugin, plugins_dir, {});
            expect(prepare).toHaveBeenCalled();
        });
        it('should call the config-changes module\'s add_uninstalled_plugin_to_prepare_queue method after processing an install', function() {
            uninstall('android', temp, dummyplugin, plugins_dir, {});
            expect(add_to_queue).toHaveBeenCalledWith(plugins_dir, 'DummyPlugin', 'android', true);
        });
        it('should queue up actions as appropriate for that plugin and call process on the action stack', function() {
            uninstall('android', temp, dummyplugin, plugins_dir, {});
            expect(actions_push.calls.length).toEqual(4);
            expect(c_a).toHaveBeenCalledWith(jasmine.any(Function), [jasmine.any(Object), temp, dummy_id], jasmine.any(Function), [jasmine.any(Object), path.join(plugins_dir, dummyplugin), temp, dummy_id]);
            expect(proc).toHaveBeenCalled();
        });

        describe('with dependencies', function() {
            it('should uninstall "dangling" dependencies');
            it('should not uninstall any dependencies that are relied on by other plugins');
        });
    });

    describe('failure', function() {
        it('should throw if platform is unrecognized', function() {
            expect(function() {
                uninstall('atari', temp, 'SomePlugin', plugins_dir, {});
            }).toThrow('atari not supported.');
        });
        it('should throw if plugin is missing', function() {
            exists.andReturn(false);
            expect(function() {
                uninstall('android', temp, 'SomePluginThatDoesntExist', plugins_dir, {});
            }).toThrow('Plugin "SomePluginThatDoesntExist" not found. Already uninstalled?');
        });
    });
});
