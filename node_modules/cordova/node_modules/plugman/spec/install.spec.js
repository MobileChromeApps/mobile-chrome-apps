var install = require('../src/install'),
    actions = require('../src/util/action-stack'),
    config_changes = require('../src/util/config-changes'),
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
    childplugin = 'ChildBrowser',
    plugins_dir = path.join(temp, 'plugins');

describe('install', function() {
    var exists, get_json, chmod, exec, proc, add_to_queue, prepare, actions_push, c_a, mkdir;
    beforeEach(function() {
        proc = spyOn(actions.prototype, 'process').andCallFake(function(platform, proj, cb) {
            cb();
        });
        mkdir = spyOn(shell, 'mkdir');
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
        add_to_queue = spyOn(config_changes, 'add_installed_plugin_to_prepare_queue');
    });
    describe('success', function() {
        it('should call prepare after a successful install', function() {
            install('android', temp, dummyplugin, plugins_dir, {});
            expect(prepare).toHaveBeenCalled();
        });

        it('should call fetch if provided plugin cannot be resolved locally', function() {
            var s = spyOn(plugman, 'fetch');
            exists.andReturn(false);
            install('android', temp, 'CLEANYOURSHORTS', plugins_dir, {});
            expect(s).toHaveBeenCalled();
        });
        it('should call the config-changes module\'s add_installed_plugin_to_prepare_queue method after processing an install', function() {
            install('android', temp, dummyplugin, plugins_dir, {});
            expect(add_to_queue).toHaveBeenCalledWith(plugins_dir, 'DummyPlugin', 'android', {}, true);
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
            exec.andReturn({code:0,output:"2.5.0"});
            install('android', temp, 'engineplugin', plugins_dir, {});
            expect(spy).toHaveBeenCalledWith('2.5.0','>=2.3.0');
        });
        it('should check version and munge it a little if it has "rc" in it so it plays nice with semver (introduce a dash in it)', function() {
            var spy = spyOn(semver, 'satisfies').andReturn(true);
            exec.andReturn({code:0,output:"3.0.0rc1"});
            install('android', temp, 'engineplugin', plugins_dir, {});
            expect(spy).toHaveBeenCalledWith('3.0.0-rc1','>=2.3.0');
        });
        it('should queue up actions as appropriate for that plugin and call process on the action stack', function() {
            install('android', temp, dummyplugin, plugins_dir, {});
            expect(actions_push.calls.length).toEqual(3);
            expect(c_a).toHaveBeenCalledWith(jasmine.any(Function), [jasmine.any(Object), path.join(plugins_dir, dummyplugin), temp, dummy_id], jasmine.any(Function), [jasmine.any(Object), temp, dummy_id]);
            expect(proc).toHaveBeenCalled();
        });
        it('should emit a results event with platform-agnostic <info>', function() {
            var emit = spyOn(plugman, 'emit');
            install('android', temp, childplugin, plugins_dir, {});
            expect(emit).toHaveBeenCalledWith('results', 'No matter what platform you are installing to, this notice is very important.');
        });
        it('should emit a results event with platform-specific <info>', function() {
            var emit = spyOn(plugman, 'emit');
            install('android', temp, childplugin, plugins_dir, {});
            expect(emit).toHaveBeenCalledWith('results', 'Please make sure you read this because it is very important to complete the installation of your plugin.');
        });
        it('should interpolate variables into <info> tags', function() {
            var emit = spyOn(plugman, 'emit');
            install('android', temp, variableplugin, plugins_dir, {cli_variables:{API_KEY:'batman'}});
            expect(emit).toHaveBeenCalledWith('results', 'Remember that your api key is batman!');
        });

        describe('with dependencies', function() {
            it('should process all dependent plugins', function() {
                // Plugin A depends on C & D
                install('android', temp, 'A', path.join(plugins_dir, 'dependencies'), {});
                // So process should be called 3 times
                expect(proc.calls.length).toEqual(3);
            });
            it('should fetch any dependent plugins if missing', function() {
                var deps_dir = path.join(plugins_dir, 'dependencies'),
                    s = spyOn(plugman, 'fetch').andCallFake(function(id, dir, opts, cb) {
                    cb(false, path.join(dir, id));
                });
                exists.andReturn(false);
                // Plugin A depends on C & D
                install('android', temp, 'A', deps_dir, {});
                expect(s).toHaveBeenCalledWith('C', deps_dir, { link: false, subdir: undefined, git_ref: undefined}, jasmine.any(Function));
                expect(s.calls.length).toEqual(3);
            });
        });
    });

    describe('failure', function() {
        it('should throw if platform is unrecognized', function() {
            expect(function() {
                install('atari', temp, 'SomePlugin', plugins_dir, {});
            }).toThrow('atari not supported.');
        });
        it('should throw if variables are missing', function() {
            expect(function() {
                install('android', temp, variableplugin, plugins_dir, {});
            }).toThrow('Variable(s) missing: API_KEY');
        });
        it('should throw if git is not found on the path and a remote url is requested', function() {
            exists.andReturn(false);
            var which_spy = spyOn(shell, 'which').andReturn(null);
            expect(function() {
                install('android', temp, 'https://git-wip-us.apache.org/repos/asf/cordova-plugin-camera.git', plugins_dir, {});
            }).toThrow('"git" command line tool is not installed: make sure it is accessible on your PATH.');
        });
    });
});
