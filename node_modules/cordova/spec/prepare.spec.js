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
    Q = require('q'),
    hooks = path.join(fixtures, 'hooks');

var project_dir = '/some/path';
var supported_platforms = Object.keys(platforms).filter(function(p) { return p != 'www'; });
var supported_platforms_paths = supported_platforms.map(function(p) { return path.join(project_dir, 'platforms', p, 'www'); });

describe('prepare command', function() {
    var is_cordova,
        cd_project_root,
        list_platforms,
        fire,
        config_parser,
        mock_config_parser,
        parsers = {},
        plugman_prepare,
        find_plugins,
        plugman_get_json,
        cp,
        mkdir,
        load;
    beforeEach(function() {
        is_cordova = spyOn(util, 'isCordova').andReturn(project_dir);
        cd_project_root = spyOn(util, 'cdProjectRoot').andReturn(project_dir);
        list_platforms = spyOn(util, 'listPlatforms').andReturn(supported_platforms);
        fire = spyOn(hooker.prototype, 'fire').andReturn(Q());
        mock_config_parser = {
            merge_with: jasmine.createSpy("config_parser merge_with")
        };
        config_parser = spyOn(util, 'config_parser').andReturn(mock_config_parser);
        supported_platforms.forEach(function(p) {
            parsers[p] = jasmine.createSpy(p + ' update_project').andReturn(Q());
            spyOn(platforms[p], 'parser').andReturn({
                update_project:parsers[p],
                update_www: jasmine.createSpy(p + ' update_www'),
                cordovajs_path: function(libDir) { return 'path/to/cordova.js/in/.cordova/lib';},
                www_dir:function() { return path.join(project_dir, 'platforms', p, 'www'); },
                config_xml: function () { return path.join(project_dir, "platforms", p, "www", "config.xml");}
            });
        });
        plugman_prepare = spyOn(plugman, 'prepare').andReturn(Q());
        find_plugins = spyOn(util, 'findPlugins').andReturn([]);
        plugman_get_json = spyOn(plugman.config_changes, 'get_platform_json').andReturn({});
        load = spyOn(lazy_load, 'based_on_config').andReturn(Q());
        cp = spyOn(shell, 'cp').andReturn(true);
        mkdir = spyOn(shell, 'mkdir')
    });

    describe('failure', function() {
        it('should not run outside of a cordova-based project by calling util.isCordova', function(done) {
            is_cordova.andReturn(false);
            cordova.raw.prepare().then(function() {
                expect('this call').toBe('fail');
            }, function(err) {
                expect(err).toEqual(new Error('Current working directory is not a Cordova-based project.'));
            }).fin(done);
        });
        it('should not run inside a cordova-based project with no platforms', function(done) {
            list_platforms.andReturn([]);
            cordova.raw.prepare().then(function() {
                expect('this call').toBe('fail');
            }, function(err) {
                expect(err).toEqual(new Error('No platforms added to this project. Please use `cordova platform add <platform>`.'));
            }).fin(done);
        });
    });

    describe('success', function() {
        it('should run inside a Cordova-based project by calling util.isCordova', function(done) {
            cordova.raw.prepare().then(function() {
                expect(is_cordova).toHaveBeenCalled();
            }, function(err) {
                expect(err).toBeUndefined();
            }).fin(done);
        });
        it('should parse user\'s config.xml by instantiating a config_parser only _after_ before_prepare is called', function(done) {
            var before_prep;
            config_parser.andCallFake(function() {
                expect(before_prep).toBe(true);
                return mock_config_parser;
            });
            fire.andCallFake(function(e, opts) {
                if (e == 'before_prepare') {
                    before_prep = true;
                    expect(config_parser).not.toHaveBeenCalled();
                }
                return Q();
            });

            cordova.raw.prepare().then(function() {
                expect(before_prep).toBe(true);
                expect(config_parser).toHaveBeenCalledWith(path.join(project_dir, 'www', 'config.xml'));
            }, function(err) {
                expect(err).toBeUndefined();
            }).fin(done);
        });
        it('should invoke each platform\'s parser\'s update_project method', function(done) {
            cordova.raw.prepare().then(function() {
                supported_platforms.forEach(function(p) {
                    expect(parsers[p]).toHaveBeenCalled();
                });
            }, function(err) {
                expect(err).toBeUndefined();
            }).fin(done);
        });
        it('should invoke lazy_load for each platform to make sure platform libraries are loaded', function(done) {
            cordova.raw.prepare().then(function() {
                supported_platforms.forEach(function(p) {
                    expect(load).toHaveBeenCalledWith(project_dir, p);
                });
            }, function(err) {
                expect(err).toBeUndefined();
            }).fin(done);
        });
        describe('plugman integration', function() {
            it('should invoke plugman.prepare after update_project', function(done) {
                cordova.raw.prepare().then(function() {
                    var plugins_dir = path.join(project_dir, 'plugins');
                    supported_platforms.forEach(function(p) {
                        var platform_path = path.join(project_dir, 'platforms', p);
                        expect(plugman_prepare).toHaveBeenCalledWith(platform_path, (p=='blackberry'?'blackberry10':p), plugins_dir);
                    });
                }, function(err) {
                    expect(err).toBeUndefined();
                }).fin(done);
            });
            it('should invoke add_plugin_changes for any added plugins to verify configuration changes for plugins are in place', function(done) {
                var plugins_dir = path.join(project_dir, 'plugins');
                find_plugins.andReturn(['testPlugin']);
                plugman_get_json.andReturn({
                    installed_plugins:{
                        'testPlugin':'plugin vars'
                    }
                });
                var add_plugin_changes = spyOn(plugman.config_changes, 'add_plugin_changes');
                cordova.raw.prepare().then(function() {
                    supported_platforms.forEach(function(p) {
                        var platform_path = path.join(project_dir, 'platforms', p);
                        expect(add_plugin_changes).toHaveBeenCalledWith((p=='blackberry'?'blackberry10':p), platform_path, plugins_dir, 'testPlugin', 'plugin vars', true, false);
                    });
                }, function(err) {
                    expect(err).toBeUndefined();
                }).fin(done);
            });
        });
        it('should merge the platform level config.xml with the top level config.xml', function (done) {
            cordova.raw.prepare().then(function() {
                supported_platforms.forEach(function(p) {
                    expect(util.config_parser).toHaveBeenCalledWith(platforms[p].parser().config_xml());
                    expect(mock_config_parser.merge_with).toHaveBeenCalledWith(mock_config_parser, p, true);
                });
            }, function(err) {
                expect(err).toBeUndefined();
            }).fin(done);
        });
    });


    describe('hooks', function() {
        describe('when platforms are added', function() {
            it('should fire before hooks through the hooker module, and pass in platforms and paths as data object', function(done) {
                cordova.raw.prepare().then(function() {
                    expect(fire).toHaveBeenCalledWith('before_prepare', {verbose: false, platforms:supported_platforms, options: [], paths:supported_platforms_paths});
                }, function(err) {
                    expect(err).toBeUndefined();
                }).fin(done);
            });
            it('should fire after hooks through the hooker module, and pass in platforms and paths as data object', function(done) {
                cordova.raw.prepare('android').then(function() {
                     expect(fire).toHaveBeenCalledWith('after_prepare', {verbose: false, platforms:['android'], options: [], paths:[path.join(project_dir, 'platforms', 'android', 'www')]});
                }, function(err) {
                    expect(err).toBeUndefined();
                }).fin(done);
            });
        });

        describe('with no platforms added', function() {
            beforeEach(function() {
                list_platforms.andReturn([]);
            });
            it('should not fire the hooker', function(done) {
                cordova.raw.prepare().then(function() {
                    expect('this call').toBe('fail');
                }, function(err) {
                    expect(err).toEqual(jasmine.any(Error));
                    expect(fire).not.toHaveBeenCalledWith('before_prepare');
                    expect(fire).not.toHaveBeenCalledWith('after_prepare');
                }).fin(done);
            });
        });
    });
});
