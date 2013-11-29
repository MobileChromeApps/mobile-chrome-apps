/**
    Licensed to the Apache Software Foundation (ASF) under one
    or more contributor license agreements.  See the NOTICE file
    distributed with this work for additional information
    regarding copyright ownership.  The ASF licenses this file
    to you under the Apache License, Version 2.0 (the
    "License"); you may not use this file except in compliance
    with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing,
    software distributed under the License is distributed on an
    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, either express or implied.  See the License for the
    specific language governing permissions and limitations
    under the License.
*/
var cordova = require('../cordova'),
    path = require('path'),
    shell = require('shelljs'),
    child_process = require('child_process'),
    plugman = require('plugman'),
    fs = require('fs'),
    util = require('../src/util'),
    config = require('../src/config'),
    hooker = require('../src/hooker'),
    Q = require('q'),
    platforms = require('../platforms');

var cwd = process.cwd();
var supported_platforms = Object.keys(platforms).filter(function(p) { return p != 'www'; }).sort();
var sample_plugins = ['one','two'];
var project_dir = path.join('some','path');
var plugins_dir = path.join(project_dir, 'plugins');

describe('plugin command', function() {
    var is_cordova,
        cd_project_root,
        list_platforms,
        fire,
        find_plugins,
        rm,
        mkdir,
        existsSync,
        exec,
        prep_spy,
        plugman_install,
        plugman_fetch,
        parsers = {},
        uninstallPlatform,
        uninstallPlugin;

    beforeEach(function() {
        is_cordova = spyOn(util, 'isCordova').andReturn(project_dir);
        cd_project_root = spyOn(util, 'cdProjectRoot').andReturn(project_dir);
        fire = spyOn(hooker.prototype, 'fire').andReturn(Q());
        supported_platforms.forEach(function(p) {
            parsers[p] = jasmine.createSpy(p + ' update_project').andReturn(Q());
            spyOn(platforms[p], 'parser').andReturn({
                staging_dir:function(){return ''}
            });
        });
        list_platforms = spyOn(util, 'listPlatforms').andReturn(supported_platforms);
        find_plugins = spyOn(util, 'findPlugins').andReturn(sample_plugins);
        rm = spyOn(shell, 'rm');
        mkdir = spyOn(shell, 'mkdir');
        existsSync = spyOn(fs, 'existsSync').andReturn(false);
        exec = spyOn(child_process, 'exec').andCallFake(function(cmd, opts, cb) {
            if (!cb) cb = opts;
            cb(0, '', '');
        });
        prep_spy = spyOn(cordova.raw, 'prepare').andReturn(Q());
        plugman_install = spyOn(plugman.raw, 'install').andReturn(Q());
        plugman_fetch = spyOn(plugman.raw, 'fetch').andCallFake(function(target, plugins_dir, opts) { return Q(path.join(plugins_dir, target)); });
        plugman_search = spyOn(plugman.raw, 'search').andReturn(Q());
        uninstallPlatform = spyOn(plugman.raw.uninstall, 'uninstallPlatform').andReturn(Q());
        uninstallPlugin = spyOn(plugman.raw.uninstall, 'uninstallPlugin').andReturn(Q());
    });

    describe('failure', function() {
        function expectFailure(p, done, post) {
            p.then(function() {
                expect('this call').toBe('fail');
            }, post).fin(done);
        }

        it('should not run outside of a Cordova-based project by calling util.isCordova', function(done) {
            var msg = 'Dummy message about not being in a cordova dir.';
            cd_project_root.andThrow(new Error(msg));
            is_cordova.andReturn(false);
            expectFailure(Q().then(cordova.raw.plugin), done, function(err) {
                expect(err.message).toEqual(msg);
            });
        });
        it('should report back an error if used with `add` and no plugin is specified', function(done) {
            expectFailure(cordova.raw.plugin('add'), done, function(err) {
                expect(err).toEqual(new Error('You need to qualify `add` or `remove` with one or more plugins!'));
            });
        });
        it('should report back an error if used with `rm` and no plugin is specified', function(done) {
            expectFailure(cordova.raw.plugin('rm'), done, function(err) {
                expect(err).toEqual(new Error('You need to qualify `add` or `remove` with one or more plugins!'));
            });
        });
    });

    describe('success', function() {
        it('should run inside a Cordova-based project by calling util.isCordova', function(done) {
            cordova.raw.plugin().then(function() {
                expect(is_cordova).toHaveBeenCalled();
                done();
            });
        });

        describe('`ls`', function() {
            afterEach(function() {
                cordova.removeAllListeners('results');
            });
            it('should list out no plugins for a fresh project', function(done) {
                find_plugins.andReturn([]);
                cordova.on('results', function(res) {
                    expect(res).toEqual('No plugins added. Use `cordova plugin add <plugin>`.');
                    done();
                });
                cordova.raw.plugin('list');
            });
            it('should list out added plugins in a project', function(done) {
                cordova.on('results', function(res) {
                    expect(res).toEqual(sample_plugins);
                    done();
                });
                cordova.raw.plugin('list');
            });
            it('should resolve with a list of plugins', function(done) {
                cordova.raw.plugin('list', []).then(function(plugins) {
                    expect(plugins).toEqual(sample_plugins);
                }, function(err) {
                    expect(err).toBeUndefined();
                }).fin(done);
            });
        });
        describe('`add`', function() {
            it('should call plugman.fetch for each plugin', function(done) {
                cordova.raw.plugin('add', sample_plugins).then(function() {
                    sample_plugins.forEach(function(p) {
                        expect(plugman_fetch).toHaveBeenCalledWith(p, plugins_dir, {});
                    });
                }, function(err) {
                    expect(err).toBeUndefined();
                }).fin(done);
            });
            it('should call plugman.install, for each plugin, for every platform', function(done) {
                cordova.raw.plugin('add', sample_plugins).then(function(err) {
                    sample_plugins.forEach(function(plug) {
                        supported_platforms.forEach(function(plat) {
                            expect(plugman_install).toHaveBeenCalledWith((plat=='blackberry'?'blackberry10':plat), path.join(project_dir, 'platforms', plat), plug, plugins_dir, jasmine.any(Object));
                        });
                    });
                }, function(err) {
                    expect(err).toBeUndefined();
                }).fin(done);
            });
            it('should pass down variables into plugman', function(done) {
                cordova.raw.plugin('add', "one", "--variable", "foo=bar").then(function() {
                    supported_platforms.forEach(function(plat) {
                        expect(plugman_install).toHaveBeenCalledWith((plat=='blackberry'?'blackberry10':plat), path.join(project_dir, 'platforms', plat), "one", plugins_dir, {www_dir: jasmine.any(String), cli_variables: { FOO: "bar"}});
                    });
                }, function(err) {
                    expect(err).toBeUndefined();
                }).fin(done);
            });
            it('should resolve without an error', function(done) {
                cordova.raw.plugin('add', sample_plugins).then(function() {
                    expect(1).toBe(1);
                }, function(err) {
                    expect(err).toBeUndefined();
                }).fin(done);
            });
        });
        describe('`search`', function() {
            it('should call plugman.search', function(done) {
                cordova.raw.plugin('search', sample_plugins).then(function() {
                    expect(plugman_search).toHaveBeenCalledWith(sample_plugins);
                }, function(err) {
                    expect(err).toBeUndefined();
                }).fin(done);
            });
        });
        describe('`remove`',function() {
            var plugin_parser;
            var subset = ['android', 'wp7'];
            beforeEach(function() {
                plugin_parser = spyOn(util, 'plugin_parser').andReturn({
                    platforms:subset
                });
            });
            it('should throw if plugin is not installed', function(done) {
                cordova.raw.plugin('rm', 'somethingrandom').then(function() {
                    expect('this call').toBe('fail');
                }, function(err) {
                    expect(err).toEqual(new Error('Plugin "somethingrandom" not added to project.'));
                }).fin(done);
            });

            it('should call plugman.uninstall.uninstallPlatform for every matching installedplugin-supportedplatform pair', function(done) {
                cordova.raw.plugin('rm', sample_plugins).then(function() {
                    sample_plugins.forEach(function(plug) {
                        subset.forEach(function(plat) {
                            expect(uninstallPlatform).toHaveBeenCalledWith(plat, path.join(project_dir, 'platforms', plat), plug, plugins_dir, jasmine.any(Object));
                        });
                    });
                }, function(err) {
                    expect(err).toBeUndefined();
                }).fin(done);
            });
            it('should call plugman.uninstall.uninstallPlugin once for every removed plugin', function(done) {
                uninstallPlugin.reset();
                cordova.raw.plugin('rm', sample_plugins).then(function() {
                    expect(uninstallPlugin.callCount).toBe(2);
                }, function(err) {
                    expect(err).toBeUndefined();
                }).fin(done);
            });
            it('should resolve without an error', function(done) {
                cordova.raw.plugin('rm', sample_plugins).then(function() {
                    expect(1).toBe(1);
                }, function(err) {
                    expect(err).not.toBeDefined();
                }).fin(done);
            });
        });
    });
    describe('hooks', function() {
        var plugin_parser;
        beforeEach(function() {
            plugin_parser = spyOn(util, 'plugin_parser').andReturn({
                platforms:supported_platforms
            });
        });
        describe('list (ls) hooks', function() {
            it('should fire before hooks through the hooker module', function(done) {
                cordova.raw.plugin().then(function() {
                    expect(fire).toHaveBeenCalledWith('before_plugin_ls');
                }, function(err) {
                    expect(err).toBeUndefined();
                }).fin(done);
            });
            it('should fire after hooks through the hooker module', function(done) {
                cordova.raw.plugin().then(function() {
                    expect(fire).toHaveBeenCalledWith('after_plugin_ls');
                }, function(err) {
                    expect(err).toBeUndefined();
                }).fin(done);
            });
        });
        describe('remove (rm) hooks', function() {
            it('should fire before hooks through the hooker module', function(done) {
                cordova.raw.plugin('rm', 'two').then(function() {
                    expect(fire).toHaveBeenCalledWith('before_plugin_rm', {plugins:['two'], options: []});
                }, function(err) {
                    expect(err).toBeUndefined();
                }).fin(done);
            });
            it('should fire after hooks through the hooker module', function(done) {
                cordova.raw.plugin('rm', 'one').then(function() {
                    expect(fire).toHaveBeenCalledWith('after_plugin_rm', {plugins:['one'], options:[]});
                }, function(err) {
                    expect(err).toBeUndefined();
                }).fin(done);
            });
        });
        describe('add hooks', function() {
            it('should fire before and after hooks through the hooker module', function(done) {
                cordova.raw.plugin('add', 'android').then(function() {
                    expect(fire).toHaveBeenCalledWith('before_plugin_add', {plugins:['android'], options: []});
                    expect(fire).toHaveBeenCalledWith('after_plugin_add', {plugins:['android'], options: []});
                }, function(err) {
                    expect(err).toBeUndefined();
                }).fin(done);
            });
        });
    });
});
