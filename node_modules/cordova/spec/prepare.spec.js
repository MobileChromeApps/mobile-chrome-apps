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
    shell = require('shelljs'),
    plugman = require('plugman'),
    path = require('path'),
    fs = require('fs'),
    util = require('../src/util'),
    lazy_load = require('../src/lazy_load'),
    platforms = require('../platforms'),
    hooker = require('../src/hooker'),
    fixtures = path.join(__dirname, 'fixtures'),
    hooks = path.join(fixtures, 'hooks');

var project_dir = '/some/path';
var supported_platforms = Object.keys(platforms).filter(function(p) { return p != 'www'; });
var supported_platforms_paths = supported_platforms.map(function(p) { return path.join(project_dir, 'platforms', p, 'www'); });

describe('prepare command', function() {
    var is_cordova, list_platforms, fire, config_parser, parsers = {}, plugman_prepare, find_plugins, plugman_get_json, load;
    beforeEach(function() {
        is_cordova = spyOn(util, 'isCordova').andReturn(project_dir);
        list_platforms = spyOn(util, 'listPlatforms').andReturn(supported_platforms);
        fire = spyOn(hooker.prototype, 'fire').andCallFake(function(e, opts, cb) {
            cb(false);
        });
        config_parser = spyOn(util, 'config_parser');
        supported_platforms.forEach(function(p) {
            parsers[p] = jasmine.createSpy(p + ' update_project').andCallFake(function(cfg, cb) {
                cb();
            });
            spyOn(platforms[p], 'parser').andReturn({
                update_project:parsers[p],
                www_dir:function() { return path.join(project_dir, 'platforms', p, 'www'); }
            });
        });
        plugman_prepare = spyOn(plugman, 'prepare');
        find_plugins = spyOn(util, 'findPlugins').andReturn([]);
        plugman_get_json = spyOn(plugman.config_changes, 'get_platform_json').andReturn({});
        load = spyOn(lazy_load, 'based_on_config').andCallFake(function(root, platform, cb) { cb(); });
    });

    describe('failure', function() {
        it('should not run outside of a cordova-based project by calling util.isCordova', function() {
            is_cordova.andReturn(false);
            expect(function() {
                cordova.prepare();
                expect(is_cordova).toHaveBeenCalled();
            }).toThrow('Current working directory is not a Cordova-based project.');
        });
        it('should not run inside a cordova-based project with no platforms', function() {
            list_platforms.andReturn([]);
            expect(function() {
                cordova.prepare();
            }).toThrow('No platforms added to this project. Please use `cordova platform add <platform>`.');
        });
    });

    describe('success', function() {
        it('should run inside a Cordova-based project by calling util.isCordova', function() {
            cordova.prepare();
            expect(is_cordova).toHaveBeenCalled();
        });
        it('should parse user\'s config.xml by instantiating a config_parser only _after_ before_prepare is called', function() {
            var before_prep, after_prep, cont;
            fire.andCallFake(function(e, opts, cb) {
                if (e == 'before_prepare') {
                    before_prep = true;
                }
                cont = cb;
            });
            runs(function() {
                cordova.prepare();
            });
            waitsFor(function() { return before_prep; });
            runs(function() {
                expect(config_parser).not.toHaveBeenCalled();
                cont();
                expect(config_parser).toHaveBeenCalledWith(path.join(project_dir, 'www', 'config.xml'));
            });
        });
        it('should invoke each platform\'s parser\'s update_project method', function() {
            cordova.prepare();
            supported_platforms.forEach(function(p) {
                expect(parsers[p]).toHaveBeenCalled();
            });
        });
        it('should invoke lazy_load for each platform to make sure platform libraries are loaded', function() {
            cordova.prepare();
            supported_platforms.forEach(function(p) {
                expect(load).toHaveBeenCalledWith(project_dir, p, jasmine.any(Function));
            });
        });
        describe('plugman integration', function() {
            it('should invoke plugman.prepare after update_project', function() {
                cordova.prepare();
                var plugins_dir = path.join(project_dir, 'plugins');
                supported_platforms.forEach(function(p) {
                    var platform_path = path.join(project_dir, 'platforms', p);
                    expect(plugman_prepare).toHaveBeenCalledWith(platform_path, (p=='blackberry'?'blackberry10':p), plugins_dir);
                });
            });
            it('should invoke add_plugin_changes for any added plugins to verify configuration changes for plugins are in place', function() {
                var plugins_dir = path.join(project_dir, 'plugins');
                find_plugins.andReturn(['testPlugin']);
                plugman_get_json.andReturn({
                    installed_plugins:{
                        'testPlugin':'plugin vars'
                    }
                });
                var add_plugin_changes = spyOn(plugman.config_changes, 'add_plugin_changes');
                cordova.prepare();
                supported_platforms.forEach(function(p) {
                    var platform_path = path.join(project_dir, 'platforms', p);
                    expect(add_plugin_changes).toHaveBeenCalledWith((p=='blackberry'?'blackberry10':p), platform_path, plugins_dir, 'testPlugin', 'plugin vars', true, false);
                });
            });
        });
    });


    describe('hooks', function() {
        describe('when platforms are added', function() {
            it('should fire before hooks through the hooker module, and pass in platforms and paths as data object', function() {
                cordova.prepare();
                expect(fire).toHaveBeenCalledWith('before_prepare', {verbose: false, platforms:supported_platforms, options: [], paths:supported_platforms_paths}, jasmine.any(Function));
            });
            it('should fire after hooks through the hooker module, and pass in platforms and paths as data object', function(done) {
                cordova.prepare('android', function() {
                     expect(fire).toHaveBeenCalledWith('after_prepare', {verbose: false, platforms:['android'], options: [], paths:[path.join(project_dir, 'platforms', 'android', 'www')]}, jasmine.any(Function));
                     done();
                });
            });
        });

        describe('with no platforms added', function() {
            beforeEach(function() {
                list_platforms.andReturn([]);
            });
            it('should not fire the hooker', function() {
                expect(function() {
                    cordova.prepare();
                }).toThrow();
                expect(fire).not.toHaveBeenCalledWith('before_prepare');
                expect(fire).not.toHaveBeenCalledWith('after_prepare');
            });
        });
    });
});
