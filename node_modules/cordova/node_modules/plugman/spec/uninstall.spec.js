var uninstall = require('../src/uninstall'),
    actions = require('../src/util/action-stack'),
    config_changes = require('../src/util/config-changes'),
    dependencies = require('../src/util/dependencies'),
    xml_helpers = require('../src/util/xml-helpers'),
    plugins = require('../src/util/plugins.js'),
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
    Q = require('q'),
    plugins_dir = path.join(temp, 'plugins');

describe('uninstallPlatform', function() {
    var exists, get_json, chmod, proc, add_to_queue, prepare, actions_push, c_a, rm, done;
    var gen_deps, get_chain;

    function uninstallPromise(f) {
        return f.then(function() { done = true; }, function(err) { done = err; });
    }

    beforeEach(function() {
        proc = spyOn(actions.prototype, 'process').andReturn(Q());
        actions_push = spyOn(actions.prototype, 'push');
        c_a = spyOn(actions.prototype, 'createAction');
        prepare = spyOn(plugman, 'prepare');
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
        done = false;
    });
    describe('success', function() {
        it('should call prepare after a successful uninstall', function() {
            runs(function() {
                uninstallPromise(uninstall.uninstallPlatform('android', temp, dummyplugin, plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'promise never resolved', 500);
            runs(function() {
                expect(prepare).toHaveBeenCalled();
            });
        });
        it('should call the config-changes module\'s add_uninstalled_plugin_to_prepare_queue method after processing an install', function() {
            runs(function() {
                uninstallPromise(uninstall.uninstallPlatform('android', temp, dummyplugin, plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'promise never resolved', 500);
            runs(function() {
                expect(add_to_queue).toHaveBeenCalledWith(plugins_dir, 'DummyPlugin', 'android', true);
            });
        });
        it('should queue up actions as appropriate for that plugin and call process on the action stack', function() {
            runs(function() {
                uninstallPromise(uninstall.uninstallPlatform('android', temp, dummyplugin, plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'promise never resolved', 500);
            runs(function() {
                expect(actions_push.calls.length).toEqual(4);
                expect(c_a).toHaveBeenCalledWith(jasmine.any(Function), [jasmine.any(Object), temp, dummy_id], jasmine.any(Function), [jasmine.any(Object), path.join(plugins_dir, dummyplugin), temp, dummy_id]);
                expect(proc).toHaveBeenCalled();
            });
        });

        describe('with dependencies', function() {
            var parseET, emit, danglers, dependents;
            beforeEach(function() {
                emit = spyOn(plugman, 'emit');
                parseET = spyOn(xml_helpers, 'parseElementtreeSync').andReturn({
                    _root:{
                        attrib:{}
                    },
                    find:function() { return null },
                    findall:function() { return [] }
                });
                danglers = spyOn(dependencies, 'danglers');
                dependents = spyOn(dependencies, 'dependents').andReturn([]);
            });
            it('should uninstall "dangling" dependencies', function(done) {
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

                danglers.andReturn(['one', 'two']);

                uninstall.uninstallPlatform('android', temp, dummyplugin, plugins_dir, {})
                .then(function() {
                    expect(emit).toHaveBeenCalledWith('log', 'Uninstalling 2 dangling dependent plugins.');
                }, function(err) {
                    expect(err).toBeUndefined();
                }).done(done);
            });
        });
    });

    describe('failure', function() {
        it('should throw if platform is unrecognized', function() {
            runs(function() {
                uninstallPromise(uninstall.uninstallPlatform('atari', temp, 'SomePlugin', plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'promise never resolved', 500);
            runs(function() {
                expect(done).toEqual(new Error('atari not supported.'));
            });
        });
        it('should throw if plugin is missing', function() {
            exists.andReturn(false);
            runs(function() {
                uninstallPromise(uninstall.uninstallPlatform('android', temp, 'SomePluginThatDoesntExist', plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'promise never resolved', 500);
            runs(function() {
                expect(done).toEqual(new Error('Plugin "SomePluginThatDoesntExist" not found. Already uninstalled?'));
            });
        });
    });
});

describe('uninstallPlugin', function() {
    var exists, get_json, chmod, proc, add_to_queue, prepare, actions_push, c_a, rm, uninstall_plugin, done;

    function uninstallPromise(f) {
        return f.then(function() { done = true; }, function(err) { done = err; });
    }

    beforeEach(function() {
        uninstall_plugin = spyOn(uninstall, 'uninstallPlugin').andCallThrough();
        proc = spyOn(actions.prototype, 'process').andReturn(Q());
        actions_push = spyOn(actions.prototype, 'push');
        c_a = spyOn(actions.prototype, 'createAction');
        prepare = spyOn(plugman, 'prepare');
        chmod = spyOn(fs, 'chmodSync');
        exists = spyOn(fs, 'existsSync').andReturn(true);
        get_json = spyOn(config_changes, 'get_platform_json').andReturn({
            installed_plugins:{},
            dependent_plugins:{}
        });
        rm = spyOn(shell, 'rm');
        add_to_queue = spyOn(config_changes, 'add_uninstalled_plugin_to_prepare_queue');
        done = false;
    });
    describe('success', function() {
        it('should remove the plugin directory', function() {
            runs(function() {
                uninstallPromise(uninstall.uninstallPlugin(dummyplugin, plugins_dir));
            });
            waitsFor(function() { return done; }, 'promise never resolved', 500);
            runs(function() {
                expect(rm).toHaveBeenCalled();
            });
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
            it('should delete all dangling plugins', function(done) {
                uninstall.uninstallPlugin(dummyplugin, plugins_dir)
                .then(function() {
                    expect(rm).toHaveBeenCalledWith('-rf', path.join(plugins_dir, dummyplugin));
                    expect(rm).toHaveBeenCalledWith('-rf', path.join(plugins_dir, 'somedependent'));
                    expect(rm.calls.length).toBe(2);
                }, function(err) {
                    expect(err).toBeUndefined();
                }).fin(done);
            });
        });
    });

    describe('failure', function() {
        it('should throw if plugin is missing', function() {
            exists.andReturn(false);
            runs(function() {
                uninstallPromise(uninstall('android', temp, 'SomePluginThatDoesntExist', plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'promise never resolved', 500);
            runs(function() {
                expect(done).toEqual(new Error('Plugin "SomePluginThatDoesntExist" not found. Already uninstalled?'));
            });
        });
    });
});

describe('uninstall', function() {
    var exists, get_json, chmod, proc, add_to_queue, prepare, actions_push, c_a, rm, done;

    function uninstallPromise(f) {
        return f.then(function() { done = true; }, function(err) { done = err; });
    }

    beforeEach(function() {
        proc = spyOn(actions.prototype, 'process').andReturn(Q());
        actions_push = spyOn(actions.prototype, 'push');
        c_a = spyOn(actions.prototype, 'createAction');
        prepare = spyOn(plugman, 'prepare');
        chmod = spyOn(fs, 'chmodSync');
        exists = spyOn(fs, 'existsSync').andReturn(true);
        get_json = spyOn(config_changes, 'get_platform_json').andReturn({
            installed_plugins:{},
            dependent_plugins:{}
        });
        rm = spyOn(shell, 'rm');
        add_to_queue = spyOn(config_changes, 'add_uninstalled_plugin_to_prepare_queue');
        done = false;
    });
    describe('success', function() {
        it('should call prepare after a successful uninstall', function() {
            runs(function() {
                uninstallPromise(uninstall('android', temp, dummyplugin, plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'promise never resolved', 500);
            runs(function() {
                expect(prepare).toHaveBeenCalled();
            });
        });
        it('should call the config-changes module\'s add_uninstalled_plugin_to_prepare_queue method after processing an install', function() {
            runs(function() {
                uninstallPromise(uninstall('android', temp, dummyplugin, plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'promise never resolved', 500);
            runs(function() {
                expect(add_to_queue).toHaveBeenCalledWith(plugins_dir, 'DummyPlugin', 'android', true);
            });
        });
        it('should queue up actions as appropriate for that plugin and call process on the action stack', function() {
            runs(function() {
                uninstallPromise(uninstall('android', temp, dummyplugin, plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'promise never resolved', 500);
            runs(function() {
                expect(actions_push.calls.length).toEqual(4);
                expect(c_a).toHaveBeenCalledWith(jasmine.any(Function), [jasmine.any(Object), temp, dummy_id], jasmine.any(Function), [jasmine.any(Object), path.join(plugins_dir, dummyplugin), temp, dummy_id]);
                expect(proc).toHaveBeenCalled();
            });
        });

        describe('with dependencies', function() {
            it('should uninstall "dangling" dependencies');
            it('should not uninstall any dependencies that are relied on by other plugins');
        });
    });

    describe('failure', function() {
        it('should throw if platform is unrecognized', function() {
            runs(function() {
                uninstallPromise(uninstall('atari', temp, 'SomePlugin', plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'promise never resolved', 500);
            runs(function() {
                expect(done).toEqual(new Error('atari not supported.'));
            });
        });
        it('should throw if plugin is missing', function() {
            exists.andReturn(false);
            runs(function() {
                uninstallPromise(uninstall('android', temp, 'SomePluginThatDoesntExist', plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'promise never resolved', 500);
            runs(function() {
                expect(done).toEqual(new Error('Plugin "SomePluginThatDoesntExist" not found. Already uninstalled?'));
            });
        });
    });
});
