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
    lazy_load = require('../src/lazy_load'),
    platform = require('../src/platform'),
    platforms = require('../platforms');

var cwd = process.cwd();
var supported_platforms = Object.keys(platforms).filter(function(p) { return p != 'www'; });
var project_dir = path.join('some', 'path');

describe('platform command', function() {
    var is_cordova, list_platforms, fire, config_parser, find_plugins, config_read, load, load_custom, rm, mkdir, existsSync, supports, pkg, name, exec, prep_spy, plugman_install, parsers = {};
    beforeEach(function() {
        supported_platforms.forEach(function(p) {
            parsers[p] = spyOn(platforms[p], 'parser').andReturn({
                staging_dir:function(){}
            });
        });
        is_cordova = spyOn(util, 'isCordova').andReturn(project_dir);
        fire = spyOn(hooker.prototype, 'fire').andCallFake(function(e, opts, cb) {
            if (cb === undefined) cb = opts;
            cb(false);
        });
        name = jasmine.createSpy('config name').andReturn('magical mystery tour');
        pkg = jasmine.createSpy('config packageName').andReturn('ca.filmaj.id');
        config_parser = spyOn(util, 'config_parser').andReturn({
            packageName:pkg,
            name:name
        });
        find_plugins = spyOn(util, 'findPlugins').andReturn([]);
        list_platforms = spyOn(util, 'listPlatforms').andReturn(supported_platforms);
        config_read = spyOn(config, 'read').andReturn({});
        load = spyOn(lazy_load, 'based_on_config').andCallFake(function(root, platform, cb) {
            cb();
        });
        load_custom = spyOn(lazy_load, 'custom').andCallFake(function(url, id, p, v, cb) {
            cb();
        });
        rm = spyOn(shell, 'rm');
        mkdir = spyOn(shell, 'mkdir');
        existsSync = spyOn(fs, 'existsSync').andReturn(false);
        supports = spyOn(platform, 'supports').andCallFake(function(project_root, name, cb) {
            cb();
        });
        exec = spyOn(shell, 'exec').andCallFake(function(cmd, opts, cb) {
            cb(0, '');
        });
        prep_spy = spyOn(cordova, 'prepare').andCallFake(function(t, cb) {
            cb();
        });
        plugman_install = spyOn(plugman, 'install');
    });

    describe('failure', function() {
        it('should not run outside of a Cordova-based project by calling util.isCordova', function() {
            is_cordova.andReturn(false);
            expect(function() {
                cordova.platform();
                expect(is_cordova).toHaveBeenCalled();
            }).toThrow('Current working directory is not a Cordova-based project.');
        });
        it('should report back an error if used with `add` and no platform is specified', function() {
            expect(function() {
               cordova.platform('add');
            }).toThrow('You need to qualify `add` or `remove` with one or more platforms!');
        });
        it('should report back an error if used with `rm` and no platform is specified', function() {
            expect(function() {
               cordova.platform('rm');
            }).toThrow('You need to qualify `add` or `remove` with one or more platforms!');
        });
    });

    describe('success', function() {
        it('should run inside a Cordova-based project by calling util.isCordova', function() {
            cordova.platform();
            expect(is_cordova).toHaveBeenCalled();
        });

        describe('`ls`', function() { 
            afterEach(function() {
                cordova.removeAllListeners('results');
            });
            it('should list out no platforms for a fresh project', function(done) {
                list_platforms.andReturn([]);
                cordova.on('results', function(res) {
                    expect(res).toEqual('No platforms added. Use `cordova platform add <platform>`.');
                    done();
                });
                cordova.platform('list');
            });

            it('should list out added platforms in a project', function(done) {
                cordova.on('results', function(res) {
                    expect(res.length).toEqual(5);
                    done();
                });
                cordova.platform('list');
            });
        });
        describe('`add`', function() {
            it('should shell out to specified platform\'s bin/create, using the version that is specified in platforms manifest', function() {
                cordova.platform('add', 'android');
                expect(exec.mostRecentCall.args[0]).toMatch(/lib.android.cordova.\d.\d.\d[\d\w]*.bin.create/gi);
                expect(exec.mostRecentCall.args[0]).toContain(project_dir);
                cordova.platform('add', 'wp8');
                expect(exec.mostRecentCall.args[0]).toMatch(/lib.wp.cordova.\d.\d.\d[\d\w]*.wp8.bin.create/gi);
                expect(exec.mostRecentCall.args[0]).toContain(project_dir);
            });
            it('should call into lazy_load.custom if there is a user-specified configruation for consuming custom libraries', function() {
                load.andCallThrough();
                config_read.andReturn({
                    lib:{
                        'wp8':{
                            uri:'haha',
                            id:'phonegap',
                            version:'bleeding edge'
                        }
                    }
                });
                cordova.platform('add', 'wp8');
                expect(load_custom).toHaveBeenCalledWith('haha', 'phonegap', 'wp8', 'bleeding edge', jasmine.any(Function));
                expect(exec.mostRecentCall.args[0]).toMatch(/lib.wp.phonegap.bleeding edge.wp8.bin.create/gi);
                expect(exec.mostRecentCall.args[0]).toContain(project_dir);
            });
        });
        describe('`remove`',function() {
            it('should remove a supported and added platform', function() {
                cordova.platform('remove', 'android');
                expect(rm).toHaveBeenCalledWith('-rf', path.join(project_dir, 'platforms', 'android'));
                expect(rm).toHaveBeenCalledWith('-rf', path.join(project_dir, 'merges', 'android'));
            });

            it('should be able to remove multiple platforms', function() {
                cordova.platform('remove', ['android', 'blackberry10']);
                expect(rm).toHaveBeenCalledWith('-rf', path.join(project_dir, 'platforms', 'android'));
                expect(rm).toHaveBeenCalledWith('-rf', path.join(project_dir, 'merges', 'android'));
                expect(rm).toHaveBeenCalledWith('-rf', path.join(project_dir, 'platforms', 'blackberry10'));
                expect(rm).toHaveBeenCalledWith('-rf', path.join(project_dir, 'merges', 'blackberry10'));
            });
        });
    });
    describe('hooks', function() {
        describe('list (ls) hooks', function() {
            it('should fire before hooks through the hooker module', function() {
                cordova.platform();
                expect(fire).toHaveBeenCalledWith('before_platform_ls', jasmine.any(Function));
            });
            it('should fire after hooks through the hooker module', function() {
                cordova.platform();
                expect(fire).toHaveBeenCalledWith('after_platform_ls', jasmine.any(Function));
            });
        });
        describe('remove (rm) hooks', function() {
            it('should fire before hooks through the hooker module', function() {
                cordova.platform('rm', 'android');
                expect(fire).toHaveBeenCalledWith('before_platform_rm', {platforms:['android']}, jasmine.any(Function));
            });
            it('should fire after hooks through the hooker module', function() {
                cordova.platform('rm', 'android');
                expect(fire).toHaveBeenCalledWith('after_platform_rm', {platforms:['android']}, jasmine.any(Function));
            });
        });
        describe('add hooks', function() {
            it('should fire before and after hooks through the hooker module', function() {
                cordova.platform('add', 'android');
                expect(fire).toHaveBeenCalledWith('before_platform_add', {platforms:['android']}, jasmine.any(Function));
                expect(fire).toHaveBeenCalledWith('after_platform_add', {platforms:['android']}, jasmine.any(Function));
            });
        });
    });
});

describe('platform.supports(name, callback)', function() {
    var supports = {};
    beforeEach(function() {
        supported_platforms.forEach(function(p) {
            supports[p] = spyOn(platforms[p].parser, 'check_requirements').andCallFake(function(project, cb) { cb(); });
        });
    });
    it('should require a platform name', function() {
        expect(function() {
            cordova.platform.supports(project_dir, undefined, function(e){});
        }).toThrow();
    });

    it('should require a callback function', function() {
        expect(function() {
            cordova.platform.supports(project_dir, 'android', undefined);
        }).toThrow();
    });

    describe('when platform is unknown', function() {
        it('should trigger callback with false', function(done) {
            cordova.platform.supports(project_dir, 'windows-3.1', function(e) {
                expect(e).toEqual(jasmine.any(Error));
                done();
            });
        });
    });

    describe('when platform is supported', function() {
        it('should trigger callback without error', function(done) {
            cordova.platform.supports(project_dir, 'android', function(e) {
                expect(e).toBeNull();
                done();
            });
        });
    });

    describe('when platform is unsupported', function() {
        it('should trigger callback with error', function(done) {
            supported_platforms.forEach(function(p) {
                supports[p].andCallFake(function(project, cb) { cb(new Error('no sdk')); });
            });
            cordova.platform.supports(project_dir, 'android', function(e) {
                expect(e).toEqual(jasmine.any(Error));
                done();
            });
        });
    });
});

describe('platform parsers', function() {
    it('should be exposed on the platform module', function() {
        for (var platform in platforms) {
            expect(cordova.platform[platform]).toBeDefined();
            for (var prop in platforms[platform]) {
                expect(cordova.platform[platform][prop]).toBeDefined();
            }
        }
    });
});
