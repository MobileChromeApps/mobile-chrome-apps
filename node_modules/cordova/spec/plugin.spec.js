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
    plugman = require('plugman'),
    fs = require('fs'),
    util = require('../src/util'),
    config = require('../src/config'),
    hooker = require('../src/hooker'),
    platforms = require('../platforms');

var cwd = process.cwd();
var supported_platforms = Object.keys(platforms).filter(function(p) { return p != 'www'; }).sort();
var sample_plugins = ['one','two'];
var project_dir = path.join('some','path');
var plugins_dir = path.join(project_dir, 'plugins');

describe('plugin command', function() {
    var is_cordova, list_platforms, fire, find_plugins, rm, mkdir, existsSync, exec, prep_spy, plugman_install, plugman_fetch, parsers = {}, uninstallPlatform, uninstallPlugin;
    beforeEach(function() {
        is_cordova = spyOn(util, 'isCordova').andReturn(project_dir);
        fire = spyOn(hooker.prototype, 'fire').andCallFake(function(e, opts, cb) {
            if (cb === undefined) cb = opts;
            cb(false);
        });
        supported_platforms.forEach(function(p) {
            parsers[p] = jasmine.createSpy(p + ' update_project').andCallFake(function(cfg, cb) {
                cb();
            });
            spyOn(platforms[p], 'parser').andReturn({
                staging_dir:function(){return ''}
            });
        });
        list_platforms = spyOn(util, 'listPlatforms').andReturn(supported_platforms);
        find_plugins = spyOn(util, 'findPlugins').andReturn(sample_plugins);
        rm = spyOn(shell, 'rm');
        mkdir = spyOn(shell, 'mkdir');
        existsSync = spyOn(fs, 'existsSync').andReturn(false);
        exec = spyOn(shell, 'exec').andCallFake(function(cmd, opts, cb) {
            cb(0, '');
        });
        prep_spy = spyOn(cordova, 'prepare').andCallFake(function(t, cb) {
            cb();
        });
        plugman_install = spyOn(plugman, 'install').andCallFake(function(platform, platform_dir, plugin, plugins_dir, options, callback) {
            callback();
        });
        plugman_fetch = spyOn(plugman, 'fetch').andCallFake(function(target, plugins_dir, opts, cb) { cb(false, path.join(plugins_dir, target)); });
        plugman_search = spyOn(plugman, 'search').andCallFake(function(params, cb) { cb(); });
        uninstallPlatform = spyOn(plugman.uninstall, 'uninstallPlatform');
        uninstallPlugin = spyOn(plugman.uninstall, 'uninstallPlugin').andCallFake(function(target, plugins_dir, cb) {
            cb && cb();
        });
    });

    describe('failure', function() {
        it('should not run outside of a Cordova-based project by calling util.isCordova', function() {
            is_cordova.andReturn(false);
            expect(function() {
                cordova.plugin();
                expect(is_cordova).toHaveBeenCalled();
            }).toThrow('Current working directory is not a Cordova-based project.');
        });
        it('should report back an error if used with `add` and no plugin is specified', function() {
            expect(function() {
               cordova.plugin('add');
            }).toThrow('You need to qualify `add` or `remove` with one or more plugins!');
        });
        it('should report back an error if used with `rm` and no plugin is specified', function() {
            expect(function() {
               cordova.plugin('rm');
            }).toThrow('You need to qualify `add` or `remove` with one or more plugins!');
        });
    });

    describe('success', function() {
        it('should run inside a Cordova-based project by calling util.isCordova', function() {
            cordova.plugin();
            expect(is_cordova).toHaveBeenCalled();
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
                cordova.plugin('list');
            });
            it('should list out added plugins in a project', function(done) {
                cordova.on('results', function(res) {
                    expect(res).toEqual(sample_plugins);
                    done();
                });
                cordova.plugin('list');
            });
            it('should trigger callback with list of plugins', function(done) {
                cordova.plugin('list', [], function(e, plugins) {
                    expect(e).not.toBeDefined();
                    expect(plugins).toEqual(sample_plugins);
                    done();
                });
            });
        });
        describe('`add`', function() {
            it('should call plugman.fetch for each plugin', function() {
                cordova.plugin('add', sample_plugins);
                sample_plugins.forEach(function(p) {
                    expect(plugman_fetch).toHaveBeenCalledWith(p, plugins_dir, {}, jasmine.any(Function));
                });
            });
            it('should call plugman.install, for each plugin, for every platform', function() {
                cordova.plugin('add', sample_plugins);
                sample_plugins.forEach(function(plug) {
                    supported_platforms.forEach(function(plat) {
                        expect(plugman_install).toHaveBeenCalledWith((plat=='blackberry'?'blackberry10':plat), path.join(project_dir, 'platforms', plat), plug, plugins_dir, jasmine.any(Object), jasmine.any(Function));
                    });
                });
            });
            it('should pass down variables into plugman', function() {
                cordova.plugin('add', "one", "--variable", "foo=bar");
                supported_platforms.forEach(function(plat) {
                    expect(plugman_install).toHaveBeenCalledWith((plat=='blackberry'?'blackberry10':plat), path.join(project_dir, 'platforms', plat), "one", plugins_dir, {www_dir: jasmine.any(String), cli_variables: { FOO: "bar"}}, jasmine.any(Function));
                });
            });
            it('should trigger callback without an error', function(done) {
                cordova.plugin('add', sample_plugins, function(e) {
                    expect(e).not.toBeDefined();
                    done();
                });
            });
        });
        describe('`search`', function() {
            it('should call plugman.search', function() {
                cordova.plugin('search', sample_plugins);
                expect(plugman_search).toHaveBeenCalledWith(sample_plugins, jasmine.any(Function));
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
            it('should throw if plugin is not installed', function() {
                expect(function() {
                    cordova.plugin('rm', 'somethingrandom');
                }).toThrow('Plugin "somethingrandom" not added to project.');
            });

            it('should call plugman.uninstall.uninstallPlatform for every matching installedplugin-supportedplatform pair', function() {
                cordova.plugin('rm', sample_plugins);
                sample_plugins.forEach(function(plug) {
                    subset.forEach(function(plat) {
                        expect(uninstallPlatform).toHaveBeenCalledWith(plat, path.join(project_dir, 'platforms', plat), plug, plugins_dir, jasmine.any(Object));
                    });
                });
            });
            it('should call plugman.uninstall.uninstallPlugin once for every removed plugin', function() {
                uninstallPlugin.reset();
                cordova.plugin('rm', sample_plugins);
                expect(uninstallPlugin.callCount).toBe(2);
            });
            it('should trigger callback without an error', function(done) {
                cordova.plugin('rm', sample_plugins, function(e) {
                    expect(e).not.toBeDefined();
                    done();
                });
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
            it('should fire before hooks through the hooker module', function() {
                cordova.plugin();
                expect(fire).toHaveBeenCalledWith('before_plugin_ls', jasmine.any(Function));
            });
            it('should fire after hooks through the hooker module', function() {
                cordova.plugin();
                expect(fire).toHaveBeenCalledWith('after_plugin_ls', jasmine.any(Function));
            });
        });
        describe('remove (rm) hooks', function() {
            it('should fire before hooks through the hooker module', function() {
                cordova.plugin('rm', 'two');
                expect(fire).toHaveBeenCalledWith('before_plugin_rm', {plugins:['two'], options: []}, jasmine.any(Function));
            });
            it('should fire after hooks through the hooker module', function() {
                cordova.plugin('rm', 'one');
                expect(fire).toHaveBeenCalledWith('after_plugin_rm', {plugins:['one'], options:[]}, jasmine.any(Function));
            });
        });
        describe('add hooks', function() {
            it('should fire before and after hooks through the hooker module', function() {
                cordova.plugin('add', 'android');
                expect(fire).toHaveBeenCalledWith('before_plugin_add', {plugins:['android'], options: []}, jasmine.any(Function));
                expect(fire).toHaveBeenCalledWith('after_plugin_add', {plugins:['android'], options: []}, jasmine.any(Function));
            });
        });
    });
});
