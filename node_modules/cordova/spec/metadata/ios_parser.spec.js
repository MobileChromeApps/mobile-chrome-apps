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
var platforms = require('../../platforms'),
    util = require('../../src/util'),
    path = require('path'),
    shell = require('shelljs'),
    plist = require('plist'),
    xcode = require('xcode'),
    ET = require('elementtree'),
    fs = require('fs'),
    Q = require('q'),
    child_process = require('child_process'),
    config = require('../../src/config'),
    config_parser = require('../../src/config_parser'),
    cordova = require('../../cordova');

describe('ios project parser', function () {
    var proj = path.join('some', 'path');
    var exec, custom, readdir, cfg_parser;
    beforeEach(function() {
        exec = spyOn(child_process, 'exec').andCallFake(function(cmd, opts, cb) {
            if (!cb) cb = opts;
            cb(null, '', '');
        });
        custom = spyOn(config, 'has_custom_path').andReturn(false);
        readdir = spyOn(fs, 'readdirSync').andReturn(['test.xcodeproj']);
        cfg_parser = spyOn(util, 'config_parser');
    });

    function wrapper(p, done, post) {
        p.then(post, function(err) {
            expect(err).toBeUndefined();
        }).fin(done);
    }

    function errorWrapper(p, done, post) {
        p.then(function() {
            expect('this call').toBe('fail');
        }, post).fin(done);
    }

    describe('constructions', function() {
        it('should throw if provided directory does not contain an xcodeproj file', function() {
            readdir.andReturn(['noxcodehere']);
            expect(function() {
                new platforms.ios.parser(proj);
            }).toThrow('The provided path is not a Cordova iOS project.');
        });
        it('should create an instance with path, pbxproj, xcodeproj, originalName and cordovaproj properties', function() {
            expect(function() {
                var p = new platforms.ios.parser(proj);
                expect(p.path).toEqual(proj);
                expect(p.pbxproj).toEqual(path.join(proj, 'test.xcodeproj', 'project.pbxproj'));
                expect(p.xcodeproj).toEqual(path.join(proj, 'test.xcodeproj'));
            }).not.toThrow();
        });
    });

    describe('instance', function() {
        var p, cp, rm, mkdir, is_cordova, write, read;
        var ios_proj = path.join(proj, 'platforms', 'ios');
        beforeEach(function() {
            p = new platforms.ios.parser(ios_proj);
            cp = spyOn(shell, 'cp');
            rm = spyOn(shell, 'rm');
            mkdir = spyOn(shell, 'mkdir');
            is_cordova = spyOn(util, 'isCordova').andReturn(proj);
            write = spyOn(fs, 'writeFileSync');
            read = spyOn(fs, 'readFileSync').andReturn('');
        });

        describe('update_from_config method', function() {
            var et, xml, find, write_xml, root, mv;
            var cfg, find_obj, root_obj, cfg_access_add, cfg_access_rm, cfg_pref_add, cfg_pref_rm, cfg_content;
            var plist_parse, plist_build, xc;
            var update_name, xc_write;
            beforeEach(function() {
                mv = spyOn(shell, 'mv');
                find_obj = {
                    text:'hi'
                };
                root_obj = {
                    attrib:{
                        package:'android_pkg'
                    }
                };
                find = jasmine.createSpy('ElementTree find').andReturn(find_obj);
                write_xml = jasmine.createSpy('ElementTree write');
                root = jasmine.createSpy('ElementTree getroot').andReturn(root_obj);
                et = spyOn(ET, 'ElementTree').andReturn({
                    find:find,
                    write:write_xml,
                    getroot:root
                });
                xml = spyOn(ET, 'XML');
                plist_parse = spyOn(plist, 'parseFileSync').andReturn({
                });
                plist_build = spyOn(plist, 'build').andReturn('');
                update_name = jasmine.createSpy('update_name');
                xc_write = jasmine.createSpy('xcode writeSync');
                xc = spyOn(xcode, 'project').andReturn({
                    parse:function(cb) {cb();},
                    updateProductName:update_name,
                    writeSync:xc_write
                });
                cfg = new config_parser();
                cfg.name = function() { return 'testname' };
                cfg.packageName = function() { return 'testpkg' };
                cfg.version = function() { return 'one point oh' };
                cfg.access.get = function() { return [] };
                cfg.preference.get = function() { return [] };
                cfg.content = function() { return 'index.html'; };
                cfg_access_add = jasmine.createSpy('config_parser access add');
                cfg_access_rm = jasmine.createSpy('config_parser access rm');
                cfg_pref_rm = jasmine.createSpy('config_parser pref rm');
                cfg_pref_add = jasmine.createSpy('config_parser pref add');
                cfg_content = jasmine.createSpy('config_parser content');
                cfg_parser.andReturn({
                    access:{
                        remove:cfg_access_rm,
                        get:function(){},
                        add:cfg_access_add
                    },
                    preference:{
                        remove:cfg_pref_rm,
                        get:function(){},
                        add:cfg_pref_add
                    },
                    content:cfg_content
                });
                p = new platforms.ios.parser(ios_proj);
            });

            it('should update the app name in pbxproj by calling xcode.updateProductName, and move the ios native files to match the new name', function(done) {
                var test_path = path.join(proj, 'platforms', 'ios', 'test');
                var testname_path = path.join(proj, 'platforms', 'ios', 'testname');
                wrapper(p.update_from_config(cfg), done, function() {
                    expect(update_name).toHaveBeenCalledWith('testname');
                    expect(mv).toHaveBeenCalledWith(path.join(test_path, 'test-Info.plist'), path.join(test_path, 'testname-Info.plist'));
                    expect(mv).toHaveBeenCalledWith(path.join(test_path, 'test-Prefix.pch'), path.join(test_path, 'testname-Prefix.pch'));
                    expect(mv).toHaveBeenCalledWith(test_path + '.xcodeproj', testname_path + '.xcodeproj');
                    expect(mv).toHaveBeenCalledWith(test_path, testname_path);
                });
            });
            it('should write out the app id to info plist as CFBundleIdentifier', function(done) {
                wrapper(p.update_from_config(cfg), done, function() {
                    expect(plist_build.mostRecentCall.args[0].CFBundleIdentifier).toEqual('testpkg');
                });
            });
            it('should write out the app version to info plist as CFBundleVersion', function(done) {
                wrapper(p.update_from_config(cfg), done, function() {
                    expect(plist_build.mostRecentCall.args[0].CFBundleVersion).toEqual('one point oh');
                });
            });
        });
        describe('www_dir method', function() {
            it('should return /www', function() {
                expect(p.www_dir()).toEqual(path.join(ios_proj, 'www'));
            });
        });
        describe('staging_dir method', function() {
            it('should return .staging/www', function() {
                expect(p.staging_dir()).toEqual(path.join(ios_proj, '.staging', 'www'));
            });
        });
        describe('config_xml method', function() {
            it('should return the location of the config.xml', function() {
                expect(p.config_xml()).toEqual(path.join(ios_proj, 'test', 'config.xml'));
            });
        });
        describe('update_www method', function() {
            it('should rm project-level www and cp in platform agnostic www', function() {
                p.update_www(path.join('lib','dir'));
                expect(rm).toHaveBeenCalled();
                expect(cp).toHaveBeenCalled();
            });
        });
        describe('update_overrides method', function() {
            var exists;
            beforeEach(function() {
                exists = spyOn(fs, 'existsSync').andReturn(true);
            });
            it('should do nothing if merges directory does not exist', function() {
                exists.andReturn(false);
                p.update_overrides();
                expect(cp).not.toHaveBeenCalled();
            });
            it('should copy merges path into www', function() {
                p.update_overrides();
                expect(cp).toHaveBeenCalled();
            });
        });
        describe('update_staging method', function() {
            var exists;
            beforeEach(function() {
                exists = spyOn(fs, 'existsSync').andReturn(true);
            });
            it('should do nothing if staging dir does not exist', function() {
                exists.andReturn(false);
                p.update_staging();
                expect(cp).not.toHaveBeenCalled();
            });
            it('should copy the staging dir into www if staging dir exists', function() {
                p.update_staging();
                expect(cp).toHaveBeenCalled();
            });
        });
        describe('update_project method', function() {
            var config, www, overrides, staging, svn;
            beforeEach(function() {
                config = spyOn(p, 'update_from_config').andReturn(Q());
                www = spyOn(p, 'update_www');
                overrides = spyOn(p, 'update_overrides');
                staging = spyOn(p, 'update_staging');
                svn = spyOn(util, 'deleteSvnFolders');
            });
            it('should call update_from_config', function(done) {
                wrapper(p.update_project(), done, function() {
                    expect(config).toHaveBeenCalled();
                });
            });
            it('should throw if update_from_config errors', function(done) {
                var e = new Error('uh oh!');
                config.andReturn(Q.reject(e));
                errorWrapper(p.update_project({}), done, function(err) {
                    expect(err).toEqual(e);
                });
            });
            it('should not call update_www', function(done) {
                wrapper(p.update_project({}), done, function() {
                    expect(www).not().toHaveBeenCalled();
                });
            });
            it('should call update_overrides', function(done) {
                wrapper(p.update_project(), done, function() {
                    expect(overrides).toHaveBeenCalled();
                });
            });
            it('should call update_staging', function(done) {
                wrapper(p.update_project(), done, function() {
                    expect(staging).toHaveBeenCalled();
                });
            });
            it('should call deleteSvnFolders', function(done) {
                wrapper(p.update_project(), done, function() {
                    expect(svn).toHaveBeenCalled();
                });
            });
        });
    });
});
