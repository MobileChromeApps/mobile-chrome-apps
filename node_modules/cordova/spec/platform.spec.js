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
    lazy_load = require('../src/lazy_load'),
    Q = require('q'),
    platform = require('../src/platform'),
    platforms = require('../platforms');

var cwd = process.cwd();
var supported_platforms = Object.keys(platforms).filter(function(p) { return p != 'www'; });
var project_dir = path.join('some', 'path');

describe('platform command', function() {
    var is_cordova,
        cd_project_root,
        list_platforms,
        fire,
        config_parser,
        find_plugins,
        config_read,
        load,
        load_custom,
        rm,
        mkdir,
        existsSync,
        supports,
        pkg,
        name,
        exec,
        prep_spy,
        plugman_install,
        parsers = {};
    beforeEach(function() {
        supported_platforms.forEach(function(p) {
            parsers[p] = spyOn(platforms[p], 'parser').andReturn({
                staging_dir:function(){}
            });
        });
        is_cordova = spyOn(util, 'isCordova').andReturn(project_dir);
        cd_project_root = spyOn(util, 'cdProjectRoot').andReturn(project_dir);
        fire = spyOn(hooker.prototype, 'fire').andReturn(Q());
        name = jasmine.createSpy('config name').andReturn('magical mystery tour');
        pkg = jasmine.createSpy('config packageName').andReturn('ca.filmaj.id');
        config_parser = spyOn(util, 'config_parser').andReturn({
            packageName:pkg,
            name:name
        });
        find_plugins = spyOn(util, 'findPlugins').andReturn([]);
        list_platforms = spyOn(util, 'listPlatforms').andReturn(supported_platforms);
        util.libDirectory = path.join('HOMEDIR', '.cordova', 'lib');
        config_read = spyOn(config, 'read').andReturn({});

        fakeLazyLoad = function(id, platform, version) {
            if (platform == 'wp7' || platform == 'wp8') {
                return Q(path.join('lib', 'wp', id, version, platform));
            } else {
                return Q(path.join('lib', platform, id, version, platforms[platform] && platforms[platform].subdirectory ? platforms[platform].subdirectory : ''));
            }
        };
        lazyLoadVersion = '3.1.0';
        load = spyOn(lazy_load, 'based_on_config').andCallFake(function(root, platform) {
            return fakeLazyLoad('cordova', platform, lazyLoadVersion);
        });
        load_custom = spyOn(lazy_load, 'custom').andCallFake(function(url, id, platform, version) {
            return fakeLazyLoad(id, platform, version);
        });

        rm = spyOn(shell, 'rm');
        mkdir = spyOn(shell, 'mkdir');
        existsSync = spyOn(fs, 'existsSync').andReturn(false);
        supports = spyOn(platform, 'supports').andReturn(Q());
        exec = spyOn(child_process, 'exec').andCallFake(function(cmd, opts, cb) {
            if (!cb) cb = opts;
            cb(null, '', '');
        });
        prep_spy = spyOn(cordova.raw, 'prepare').andReturn(Q());
        plugman_install = spyOn(plugman, 'install').andReturn(Q());
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
            expectFailure(Q().then(cordova.raw.platform), done, function(err) {
                expect(cd_project_root).toHaveBeenCalled();
                expect(err.message).toEqual(msg);
            });
        });
        it('should report back an error if used with `add` and no platform is specified', function(done) {
            expectFailure(cordova.raw.platform('add'), done, function(err) {
                expect(err).toEqual(new Error('You need to qualify `add` or `remove` with one or more platforms!'));
            });
        });
        it('should report back an error if used with `rm` and no platform is specified', function(done) {
            expectFailure(cordova.raw.platform('rm'), done, function(err) {
                expect(err).toEqual(new Error('You need to qualify `add` or `remove` with one or more platforms!'));
            });
        });
    });

    describe('success', function() {
        it('should run inside a Cordova-based project by calling util.isCordova', function(done) {
            cordova.raw.platform().then(function() {
                expect(is_cordova).toHaveBeenCalled();
                done();
            });
        });

        describe('`ls`', function() {
            afterEach(function() {
                cordova.removeAllListeners('results');
            });
            it('should list out no platforms for a fresh project', function(done) {
                list_platforms.andReturn([]);
                cordova.on('results', function(res) {
                    expect(res).toMatch(/^Installed platforms:\s*Available platforms:.*$/);
                    done();
                });
                cordova.raw.platform('list');
            });

            it('should list out added platforms in a project', function(done) {
                cordova.on('results', function(res) {
                    expect(res).toMatch(/^Installed platforms: ios, android, ubuntu, amazon-fireos, wp7, wp8, blackberry10, firefoxos, windows8\s*Available platforms:\s*$/);
                    done();
                });
                cordova.raw.platform('list');
            });
        });
        describe('`add`', function() {
            it('should shell out to specified platform\'s bin/create, using the version that is specified in platforms manifest', function(done) {
                cordova.raw.platform('add', 'android').then(function() {
                    expect(exec.mostRecentCall.args[0]).toMatch(/lib.android.cordova.\d.\d.\d[\d\-\w]*.bin.create/gi);
                    expect(exec.mostRecentCall.args[0]).toContain(project_dir);
                }).then(function() {
                    return cordova.raw.platform('add', 'wp7');
                }).then(function() {
                    expect(exec.mostRecentCall.args[0]).toMatch(/lib.wp.cordova.\d.\d.\d[\d\w\-]*.wp7.*.bin.create/gi);
                    expect(exec.mostRecentCall.args[0]).toContain(project_dir);
                }).then(function() {
                    return cordova.raw.platform('add', 'wp8');
                }).then(function() {
                    expect(exec.mostRecentCall.args[0]).toMatch(/lib.wp.cordova.\d.\d.\d[\d\w\-]*.wp8.*.bin.create/gi);
                    expect(exec.mostRecentCall.args[0]).toContain(project_dir);
                }).then(function(){
                    return cordova.raw.platform('add', 'windows8');
                }).then(function(){
                    expect(exec.mostRecentCall.args[0]).toMatch(/lib.windows8.cordova.\d.\d.\d[\d\w\-]*.windows8.*.bin.create/gi);
                    expect(exec.mostRecentCall.args[0]).toContain(project_dir);
                    done();
                });
            });
            it('should call into lazy_load.custom if there is a user-specified configruation for consuming custom libraries', function(done) {
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
                cordova.raw.platform('add', 'wp8').then(function() {
                    expect(load_custom).toHaveBeenCalledWith('haha', 'phonegap', 'wp8', 'bleeding edge');
                    expect(exec.mostRecentCall.args[0]).toMatch(/lib.wp.phonegap.bleeding edge.wp8.*.bin.create/gi);
                    expect(exec.mostRecentCall.args[0]).toContain(project_dir);
                    done();
                });
            });
            it('should use a custom template directory if there is one specified in the configuration', function(done) {
                var template_dir = "/tmp/custom-template"
                load.andCallThrough();
                config_read.andReturn({
                    lib: {
                        android: {
                            uri: "https://git-wip-us.apache.org/repos/asf?p=cordova-android.git",
                            version: "3.0.0",
                            id: "cordova",
                            template: template_dir
                        }
                    }
                });
                cordova.raw.platform('add', 'android').then(function() {
                    expect(exec.mostRecentCall.args[0]).toMatch(/^"[^ ]*" +"[^"]*" +"[^"]*" +"[^"]*" +"[^"]*"$/g);
                    expect(exec.mostRecentCall.args[0]).toContain(project_dir);
                    expect(exec.mostRecentCall.args[0]).toContain(template_dir);
                    done();
                });
            });
            it('should not use a custom template directory if there is not one specified in the configuration', function(done) {
                load.andCallThrough();
                config_read.andReturn({
                    lib: {
                        android: {
                            uri: "https://git-wip-us.apache.org/repos/asf?p=cordova-android.git",
                            version: "3.0.0",
                            id: "cordova",
                        }
                    }
                });
                cordova.raw.platform('add', 'android').then(function() {
                    expect(exec.mostRecentCall.args[0]).toMatch(/^"[^ ]*" +"[^"]*" +"[^"]*" +"[^"]*"$/g);
                    expect(exec.mostRecentCall.args[0]).toContain(project_dir);
                    done();
                });
            });
            it('should not use a custom template directory if there is no user-defined configuration', function(done) {
                cordova.raw.platform('add', 'android').then(function() {
                    expect(exec.mostRecentCall.args[0]).toMatch(/^"[^ ]*" +"[^"]*" +"[^"]*" +"[^"]*"$/g);
                    expect(exec.mostRecentCall.args[0]).toContain(project_dir);
                    done();
                });
            });
        });
        describe('`remove`',function() {
            it('should remove a supported and added platform', function(done) {
                cordova.raw.platform('remove', 'android').then(function() {
                    expect(rm).toHaveBeenCalledWith('-rf', path.join(project_dir, 'platforms', 'android'));
                    expect(rm).toHaveBeenCalledWith('-rf', path.join(project_dir, 'merges', 'android'));
                    done();
                });
            });

            it('should be able to remove multiple platforms', function(done) {
                cordova.raw.platform('remove', ['android', 'blackberry10']).then(function() {
                    expect(rm).toHaveBeenCalledWith('-rf', path.join(project_dir, 'platforms', 'android'));
                    expect(rm).toHaveBeenCalledWith('-rf', path.join(project_dir, 'merges', 'android'));
                    expect(rm).toHaveBeenCalledWith('-rf', path.join(project_dir, 'platforms', 'blackberry10'));
                    expect(rm).toHaveBeenCalledWith('-rf', path.join(project_dir, 'merges', 'blackberry10'));
                    done();
                });
            });
        });
        describe('`update`', function() {
            describe('failure', function() {
                it('should fail if no platform is specified', function(done) {
                    cordova.raw.platform('update', []).then(function() {
                        expect('this call').toBe('fail');
                    }, function(err) {
                        expect(err).toEqual(new Error('No platform provided. Please specify a platform to update.'));
                    }).fin(done);
                });
                it('should fail if more than one platform is specified', function(done) {
                    cordova.raw.platform('update', ['android', 'ios']).then(function() {
                        expect('this call').toBe('fail');
                    }, function(err) {
                        expect(err).toEqual(new Error('Platform update can only be executed on one platform at a time.'));
                    }).fin(done);
                });
            });

            // Don't run this test on windows ... iOS will fail always
            if(!require('os').platform().match(/^win/)) {
                describe('success', function() {
                    it('should shell out to the platform update script', function(done) {
                        var oldVersion = lazyLoadVersion;
                        lazyLoadVersion = '1.0.0';
                        cordova.raw.platform('update', ['ios']).then(function() {
                            expect(exec).toHaveBeenCalledWith('lib/ios/cordova/1.0.0/bin/update "some/path/platforms/ios"', jasmine.any(Function));
                        }, function(err) {
                            expect(err).toBeUndefined();
                        }).fin(function() {
                            lazyLoadVersion = oldVersion;
                            done();
                        });
                    });
                });
            }
        });
    });
    describe('hooks', function() {
        describe('list (ls) hooks', function(done) {
            it('should fire before hooks through the hooker module', function() {
                cordova.raw.platform().then(function() {
                    expect(fire).toHaveBeenCalledWith('before_platform_ls');
                    done();
                });
            });
            it('should fire after hooks through the hooker module', function(done) {
                cordova.raw.platform().then(function() {
                    expect(fire).toHaveBeenCalledWith('after_platform_ls');
                    done();
                });
            });
        });
        describe('remove (rm) hooks', function() {
            it('should fire before hooks through the hooker module', function(done) {
                cordova.raw.platform('rm', 'android').then(function() {
                    expect(fire).toHaveBeenCalledWith('before_platform_rm', {platforms:['android']});
                    done();
                });
            });
            it('should fire after hooks through the hooker module', function(done) {
                cordova.raw.platform('rm', 'android').then(function() {
                    expect(fire).toHaveBeenCalledWith('after_platform_rm', {platforms:['android']});
                    done();
                });
            });
        });
        describe('add hooks', function() {
            it('should fire before and after hooks through the hooker module', function(done) {
                cordova.raw.platform('add', 'android').then(function() {
                    expect(fire).toHaveBeenCalledWith('before_platform_add', {platforms:['android']});
                    expect(fire).toHaveBeenCalledWith('after_platform_add', {platforms:['android']});
                    done();
                });
            });
        });
    });
});

describe('platform.supports(name)', function() {
    var supports = {};
    beforeEach(function() {
        supported_platforms.forEach(function(p) {
            supports[p] = spyOn(platforms[p].parser, 'check_requirements').andReturn(Q());
        });
    });

    function expectFailure(p, done, post) {
        p.then(function() {
            expect('this call').toBe('fail');
        }, post).fin(done);
    }

    it('should require a platform name', function(done) {
        expectFailure(cordova.raw.platform.supports(project_dir, undefined), done, function(err) {
            expect(err).toEqual(jasmine.any(Error));
        });
    });

    describe('when platform is unknown', function() {
        it('should reject', function(done) {
            expectFailure(cordova.raw.platform.supports(project_dir, 'windows-3.1'), done, function(err) {
                expect(err).toEqual(jasmine.any(Error));
                done();
            });
        });
    });

    describe('when platform is supported', function() {
        it('should resolve', function(done) {
            cordova.raw.platform.supports(project_dir, 'android').then(function() {
                expect(1).toBe(1);
            }, function(err) {
                expect(err).toBeUndefined();
            }).fin(done);
        });
    });

    describe('when platform is unsupported', function() {
        it('should reject', function(done) {
            supported_platforms.forEach(function(p) {
                supports[p].andReturn(Q.reject(new Error('no sdk')));
            });
            expectFailure(cordova.raw.platform.supports(project_dir, 'android'), done, function(err) {
                expect(err).toEqual(jasmine.any(Error));
            });
        });
    });
});

describe('platform parsers', function() {
    it('should be exposed on the platform module', function() {
        for (var platform in platforms) {
            expect(cordova.raw.platform[platform]).toBeDefined();
            for (var prop in platforms[platform]) {
                expect(cordova.raw.platform[platform][prop]).toBeDefined();
            }
        }
    });
});
