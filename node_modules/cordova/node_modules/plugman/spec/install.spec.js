var install = require('../src/install'),
    actions = require('../src/util/action-stack'),
    config_changes = require('../src/util/config-changes'),
    xml_helpers = require('../src/util/xml-helpers'),
    plugman = require('../plugman'),
    fs      = require('fs'),
    os      = require('osenv'),
    path    = require('path'),
    shell   = require('shelljs'),
    child_process = require('child_process'),
    semver  = require('semver'),
    temp    = __dirname,
    dummyplugin = 'DummyPlugin',
    dummy_id = 'com.phonegap.plugins.dummyplugin',
    variableplugin = 'VariablePlugin',
    engineplugin = 'EnginePlugin',
    childplugin = 'ChildBrowser',
    Q = require('q'),
    plugins_dir = path.join(temp, 'plugins');

describe('install', function() {
    var exists, get_json, chmod, exec, proc, add_to_queue, prepare, actions_push, c_a, mkdir, done;

    function installPromise(f) {
        f.then(function() { done = true; }, function(err) { done = err; });
    }

    beforeEach(function() {
        proc = spyOn(actions.prototype, 'process').andCallFake(function(platform, proj) {
            return Q();
        });
        mkdir = spyOn(shell, 'mkdir');
        actions_push = spyOn(actions.prototype, 'push');
        c_a = spyOn(actions.prototype, 'createAction');
        prepare = spyOn(plugman, 'prepare');
        exec = spyOn(child_process, 'exec').andCallFake(function(cmd, options, cb) {
            if (!cb) cb = options;
            cb(false, '', '');
        });
        chmod = spyOn(fs, 'chmodSync');
        exists = spyOn(fs, 'existsSync').andReturn(true);
        get_json = spyOn(config_changes, 'get_platform_json').andReturn({
            installed_plugins:{},
            dependent_plugins:{}
        });
        add_to_queue = spyOn(config_changes, 'add_installed_plugin_to_prepare_queue');
        done = false;
    });
    describe('success', function() {
        it('should call prepare after a successful install', function() {
            runs(function() {
                installPromise(install('android', temp, dummyplugin, plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'install promise never resolved', 500);
            runs(function() {
                expect(done).toBe(true);
                expect(prepare).toHaveBeenCalled();
            });
        });

        it('should call fetch if provided plugin cannot be resolved locally', function() {
            fetchSpy = spyOn(plugman.raw, 'fetch').andReturn(Q(path.join(plugins_dir, dummyplugin)));
            exists.andReturn(false);
            runs(function() {
                installPromise(install('android', temp, 'CLEANYOURSHORTS', plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'install promise never resolved', 500);
            runs(function() {
                expect(done).toBe(true);
                expect(fetchSpy).toHaveBeenCalled();
            });
        });
        it('should call the config-changes module\'s add_installed_plugin_to_prepare_queue method after processing an install', function() {
            runs(function() {
                installPromise(install('android', temp, dummyplugin, plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'install promise never resolved', 500);
            runs(function() {
                expect(add_to_queue).toHaveBeenCalledWith(plugins_dir, 'DummyPlugin', 'android', {}, true);
            });
        });
        it('should notify if plugin is already installed into project', function() {
            var spy = spyOn(plugman, 'emit');
            get_json.andReturn({
                installed_plugins:{
                    'com.phonegap.plugins.dummyplugin':{}
                },
                dependent_plugins:{}
            });
            install('android', temp, dummyplugin, plugins_dir, {});
            expect(spy).toHaveBeenCalledWith('results', 'Plugin "'+dummy_id+'" already installed, \'sall good.');
        });
        it('should check version if plugin has engine tag', function(){
            var spy = spyOn(semver, 'satisfies').andReturn(true);
            exec.andCallFake(function(cmd, cb) {
                cb(null, '2.5.0\n', '');
            });
            runs(function() {
                installPromise(install('android', temp, engineplugin, plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'install promise never resolved', 500);
            runs(function() {
                expect(spy).toHaveBeenCalledWith('2.5.0','>=2.3.0');
            });
        });
        it('should check version and munge it a little if it has "rc" in it so it plays nice with semver (introduce a dash in it)', function() {
            var spy = spyOn(semver, 'satisfies').andReturn(true);
            exec.andCallFake(function(cmd, cb) {
                cb(null, '3.0.0rc1\n');
            });
            runs(function() {
                installPromise(install('android', temp, engineplugin, plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'install promise never resolved', 500);
            runs(function() {
                expect(spy).toHaveBeenCalledWith('3.0.0-rc1','>=2.3.0');
            });
        });
        it('should check specific platform version over cordova version if specified', function() {
            var spy = spyOn(semver, 'satisfies').andReturn(true);
            exec.andCallFake(function(cmd, cb) {
                cb(null, '3.1.0\n', '');
            });
            runs(function() {
                installPromise(install('android', temp, 'EnginePluginAndroid', plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'install promise never resolved', 500);
            runs(function() {
                expect(spy).toHaveBeenCalledWith('3.1.0','>=3.1.0');
            });
        });
        it('should check platform sdk version if specified', function() {
            var spy = spyOn(semver, 'satisfies').andReturn(true);
            exec.andCallFake(function(cmd, cb) {
                cb(null, '18\n', '');
            });
            runs(function() {
                installPromise(install('android', temp, 'EnginePluginAndroid', plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'install promise never resolved', 500);
            runs(function() {
                expect(spy).toHaveBeenCalledWith('18.0.0','>=18');
            });
        });
        it('should check plugmans version', function() {
            var spy = spyOn(semver, 'satisfies').andReturn(true);
            runs(function() {
                installPromise(install('android', temp, engineplugin, plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'install promise never resolved', 500);
            runs(function() {
                expect(spy).toHaveBeenCalledWith('','>=0.10.0');
            });
        });
        it('should check custom engine version', function() {
            var spy = spyOn(semver, 'satisfies').andReturn(true);
            runs(function() {
                installPromise(install('android', temp, engineplugin, plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'install promise never resolved', 500);
            runs(function() {
                expect(spy).toHaveBeenCalledWith('','>=1.0.0');
            });
        });
        it('should check custom engine version that supports multiple platforms', function() {
            var spy = spyOn(semver, 'satisfies').andReturn(true);
            runs(function() {
                installPromise(install('android', temp, engineplugin, plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'install promise never resolved', 500);
            runs(function() {
                expect(spy).toHaveBeenCalledWith('','>=3.0.0');
            });
        });
        it('should not check custom engine version that is not supported for platform', function() {
            var spy = spyOn(semver, 'satisfies').andReturn(true);
            runs(function() {
                installPromise(install('blackberry10', temp, engineplugin, plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'install promise never resolved', 500);
            runs(function() {
                expect(spy).not.toHaveBeenCalledWith('','>=3.0.0');
            });
        });
        it('should queue up actions as appropriate for that plugin and call process on the action stack', function() {
            runs(function() {
                installPromise(install('android', temp, dummyplugin, plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'install promise never resolved', 500);
            runs(function() {
                expect(actions_push.calls.length).toEqual(4);
                expect(c_a).toHaveBeenCalledWith(jasmine.any(Function), [jasmine.any(Object), path.join(plugins_dir, dummyplugin), temp, dummy_id], jasmine.any(Function), [jasmine.any(Object), temp, dummy_id]);
                expect(proc).toHaveBeenCalled();
            });
        });
        it('should emit a results event with platform-agnostic <info>', function() {
            var emit = spyOn(plugman, 'emit');
            runs(function() {
                installPromise(install('android', temp, childplugin, plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'install promise never resolved', 500);
            runs(function() {
                expect(emit).toHaveBeenCalledWith('results', 'No matter what platform you are installing to, this notice is very important.');
            });
        });
        it('should emit a results event with platform-specific <info>', function() {
            var emit = spyOn(plugman, 'emit');
            runs(function() {
                installPromise(install('android', temp, childplugin, plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'install promise never resolved', 500);
            runs(function() {
                expect(emit).toHaveBeenCalledWith('results', 'Please make sure you read this because it is very important to complete the installation of your plugin.');
            });
        });
        it('should interpolate variables into <info> tags', function() {
            var emit = spyOn(plugman, 'emit');
            runs(function() {
                installPromise(install('android', temp, variableplugin, plugins_dir, {cli_variables:{API_KEY:'batman'}}));
            });
            waitsFor(function() { return done; }, 'install promise never resolved', 500);
            runs(function() {
                expect(emit).toHaveBeenCalledWith('results', 'Remember that your api key is batman!');
            });
        });

        describe('with dependencies', function() {
            it('should process all dependent plugins', function() {
                // Plugin A depends on C & D
                runs(function() {
                    installPromise(install('android', temp, 'A', path.join(plugins_dir, 'dependencies'), {}));
                });
                waitsFor(function() { return done; }, 'install promise never resolved', 500);
                runs(function() {
                    // So process should be called 3 times
                    expect(proc.calls.length).toEqual(3);
                });
            });
            it('should fetch any dependent plugins if missing', function() {
                var deps_dir = path.join(plugins_dir, 'dependencies'),
                    s = spyOn(plugman.raw, 'fetch').andCallFake(function(id, dir, opts) {
                        return Q(path.join(dir, id));
                    });
                runs(function() {
                    exists.andReturn(false);
                    // Plugin A depends on C & D
                    install('android', temp, 'A', deps_dir, {});
                });
                waits(100);
                runs(function() {
                    expect(s).toHaveBeenCalledWith('C', deps_dir, { link: false, subdir: undefined, git_ref: undefined, client: 'plugman', expected_id: 'C' });
                    expect(s.calls.length).toEqual(3);
                });
            });
            it('should try to fetch any dependent plugins from registry when url is not defined', function() {
                var deps_dir = path.join(plugins_dir, 'dependencies'),
                    s = spyOn(plugman.raw, 'fetch').andCallFake(function(id, dir) {
                        return Q(path.join(dir,id));
                    });
                exists.andReturn(false);
                // Plugin A depends on C & D
                runs(function() {
                    installPromise(install('android', temp, 'E', deps_dir, {}));
                });
                waitsFor(function() { return done; }, 'promise never resolved', 500);
                runs(function() {
                    expect(s).toHaveBeenCalledWith('D', deps_dir, { link: false, subdir: undefined, git_ref: undefined, client: 'plugman', expected_id: 'D' });
                    expect(s.calls.length).toEqual(2);
                });
            });
        });
    });

    xdescribe('failure', function() {
        it('should throw if platform is unrecognized', function() {
            runs(function() {
                installPromise(install('atari', temp, 'SomePlugin', plugins_dir, {}));
            });
            waitsFor(function() { return done; }, 'install promise never resolved', 500);
            runs(function() {
                expect(done).toEqual(new Error('atari not supported.'));
            });
        });
        it('should throw if variables are missing', function() {
            runs(function() {
                installPromise(install('android', temp, variableplugin, plugins_dir, {}));
            });
            waitsFor(function(){ return done; }, 'install promise never resolved', 500);
            runs(function() {
                expect(done).toEqual(new Error('Variable(s) missing: API_KEY'));
            });
        });
        it('should throw if git is not found on the path and a remote url is requested', function() {
            exists.andReturn(false);
            var which_spy = spyOn(shell, 'which').andReturn(null);
            runs(function() {
                installPromise(install('android', temp, 'https://git-wip-us.apache.org/repos/asf/cordova-plugin-camera.git', plugins_dir, {}));
            });
            waitsFor(function(){ return done; }, 'install promise never resolved', 500);
            runs(function() {
                expect(done).toEqual(new Error('"git" command line tool is not installed: make sure it is accessible on your PATH.'));
            });
        });
        it('should throw if plugin version is less than the minimum requirement', function(){
            var spy = spyOn(semver, 'satisfies').andReturn(false);
            exec.andCallFake(function(cmd, cb) {
                cb(null, '0.0.1\n', '');
            });
            runs(function() {
                installPromise(install('android', temp, engineplugin, plugins_dir, {}));
            });
            waitsFor(function(){ return done; }, 'install promise never resolved', 500);
            runs(function() {
                expect(done).toEqual(new Error('Plugin doesn\'t support this project\'s cordova version. cordova: 0.0.1, failed version requirement: >=2.3.0'));
            });
        });
    });
});
