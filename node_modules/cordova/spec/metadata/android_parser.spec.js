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
    fs = require('fs'),
    ET = require('elementtree'),
    config = require('../../src/config'),
    config_parser = require('../../src/config_parser'),
    cordova = require('../../cordova');

describe('android project parser', function() {
    var proj = path.join('some', 'path');
    var exists, exec, custom;
    beforeEach(function() {
        exists = spyOn(fs, 'existsSync').andReturn(true);
        exec = spyOn(shell, 'exec').andCallFake(function(cmd, opts, cb) {
            cb(0, 'android-17');
        });
        custom = spyOn(config, 'has_custom_path').andReturn(false);
    });

    describe('constructions', function() {
        it('should throw if provided directory does not contain an AndroidManifest.xml', function() {
            exists.andReturn(false);
            expect(function() {
                new platforms.android.parser(proj);
            }).toThrow('The provided path "' + proj + '" is not an Android project.');
        });
        it('should create an instance with path, strings, manifest and android_config properties', function() {
            expect(function() {
                var p = new platforms.android.parser(proj);
                expect(p.path).toEqual(proj);
                expect(p.strings).toEqual(path.join(proj, 'res', 'values', 'strings.xml'));
                expect(p.manifest).toEqual(path.join(proj, 'AndroidManifest.xml'));
                expect(p.android_config).toEqual(path.join(proj, 'res', 'xml', 'config.xml'));
            }).not.toThrow();
        });
    });

    describe('check_requirements', function() {
        it('should fire a callback if there is an error during shelling out', function(done) {
            exec.andCallFake(function(cmd, opts, cb) {
                cb(50, 'there was an errorz!');
            });
            platforms.android.parser.check_requirements(proj, function(err) {
                expect(err).toContain('there was an errorz!');
                done();
            });
        });
        it('should fire a callback if `android list target` does not return anything containing "android-17"', function(done) {
            exec.andCallFake(function(cmd, opts, cb) {
                cb(0, 'android-15');
            });
            platforms.android.parser.check_requirements(proj, function(err) {
                expect(err).toEqual('Please install Android target 17 (the Android 4.2 SDK). Make sure you have the latest Android tools installed as well. Run `android` from your command-line to install/update any missing SDKs or tools.');
                done();
            });
        });
        it('should check that `android` is on the path by calling `android list target`', function(done) {
            platforms.android.parser.check_requirements(proj, function(err) {
                expect(err).toEqual(false);
                expect(exec).toHaveBeenCalledWith('android list target', jasmine.any(Object), jasmine.any(Function));
                done();
            });
        });
        it('should check that we can update an android project by calling `android update project` on stock android path', function(done) {
            platforms.android.parser.check_requirements(proj, function(err) {
                expect(err).toEqual(false);
                expect(exec.mostRecentCall.args[0]).toMatch(/^android update project -p .* -t android-17$/gi);
                expect(exec.mostRecentCall.args[0]).toContain(util.libDirectory);
                done();
            });
        });
        it('should check that we can update an android project by calling `android update project` on a custom path if it is so defined', function(done) {
            var custom_path = path.join('some', 'custom', 'path', 'to', 'android', 'lib');
            custom.andReturn(custom_path);
            platforms.android.parser.check_requirements(proj, function(err) {
                expect(err).toEqual(false);
                expect(exec.mostRecentCall.args[0]).toMatch(/^android update project -p .* -t android-17$/gi);
                expect(exec.mostRecentCall.args[0]).toContain(custom_path);
                done();
            });
        });
    });

    describe('instance', function() {
        var p, cp, rm, is_cordova, write, read;
        var android_proj = path.join(proj, 'platforms', 'android');
        beforeEach(function() {
            p = new platforms.android.parser(android_proj);
            cp = spyOn(shell, 'cp');
            rm = spyOn(shell, 'rm');
            is_cordova = spyOn(util, 'isCordova').andReturn(proj);
            write = spyOn(fs, 'writeFileSync');
            read = spyOn(fs, 'readFileSync');
        });

        describe('update_from_config method', function() {
            var et, xml, find, write_xml, root, cfg, readdir, cfg_parser, find_obj, root_obj, cfg_access_add, cfg_access_rm, cfg_pref_add, cfg_pref_rm;
            beforeEach(function() {
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
                readdir = spyOn(fs, 'readdirSync').andReturn([path.join(proj, 'src', 'android_pkg')]);
                cfg = new config_parser();
                cfg.name = function() { return 'testname' };
                cfg.packageName = function() { return 'testpkg' };
                cfg.version = function() { return 'one point oh' };
                cfg.access.get = function() { return [] };
                cfg.preference.get = function() { return [] };
                read.andReturn('some java package');
                cfg_access_add = jasmine.createSpy('config_parser access add');
                cfg_access_rm = jasmine.createSpy('config_parser access rm');
                cfg_pref_rm = jasmine.createSpy('config_parser pref rm');
                cfg_pref_add = jasmine.createSpy('config_parser pref add');
                cfg_parser = spyOn(util, 'config_parser').andReturn({
                    access:{
                        remove:cfg_access_rm,
                        get:function(){},
                        add:cfg_access_add
                    },
                    preference:{
                        remove:cfg_pref_rm,
                        get:function(){},
                        add:cfg_pref_add
                    }
                });
            });

            it('should write out the app name to strings.xml', function() {
                p.update_from_config(cfg);
                expect(find_obj.text).toEqual('testname');
            });
            it('should write out the app id to androidmanifest.xml and update the cordova-android entry Java class', function() {
                p.update_from_config(cfg);
                expect(root_obj.attrib.package).toEqual('testpkg');
            });
            it('should write out the app version to androidmanifest.xml', function() {
                p.update_from_config(cfg);
                expect(root_obj.attrib['android:versionName']).toEqual('one point oh');
            });
            it('should wipe out the android whitelist every time', function() {
                p.update_from_config(cfg);
                expect(cfg_access_rm).toHaveBeenCalled();
            });
            it('should update the whitelist', function() {
                cfg.access.get = function() { return ['one'] };
                p.update_from_config(cfg);
                expect(cfg_access_add).toHaveBeenCalledWith('one');
            });
            it('should update preferences', function() {
                var sample_pref = {name:'pref',value:'yes'};
                cfg.preference.get = function() { return [sample_pref] };
                p.update_from_config(cfg);
                expect(cfg_pref_add).toHaveBeenCalledWith(sample_pref);
            });
            it('should wipe out the android preferences every time', function() {
                p.update_from_config(cfg);
                expect(cfg_pref_rm).toHaveBeenCalled();
            });
            it('should write out default preferences every time', function() {
                var sample_pref = {name:'preftwo',value:'false'};
                cfg.preference.get = function() { return [sample_pref] };
                p.update_from_config(cfg);
                expect(cfg_pref_add).toHaveBeenCalledWith({name:"useBrowserHistory",value:"true"});
                expect(cfg_pref_add).toHaveBeenCalledWith({name:"exit-on-suspend",value:"false"});
            });
        });
        describe('www_dir method', function() {
            it('should return assets/www', function() {
                expect(p.www_dir()).toEqual(path.join(android_proj, 'assets', 'www'));
            });
        });
        describe('staging_dir method', function() {
            it('should return .staging/www', function() {
                expect(p.staging_dir()).toEqual(path.join(android_proj, '.staging', 'www'));
            });
        });
        describe('config_xml method', function() {
            it('should return the location of the config.xml', function() {
                expect(p.config_xml()).toEqual(p.android_config);
            });
        });
        describe('update_www method', function() {
            it('should rm project-level www and cp in platform agnostic www', function() {
                p.update_www();
                expect(rm).toHaveBeenCalled();
                expect(cp).toHaveBeenCalled();
            });
            it('should copy in a fresh cordova.js from stock cordova lib if no custom lib is specified', function() {
                p.update_www();
                expect(write).toHaveBeenCalled();
                expect(read.mostRecentCall.args[0]).toContain(util.libDirectory);
            });
            it('should copy in a fresh cordova.js from custom cordova lib if custom lib is specified', function() {
                var custom_path = path.join('custom', 'path');
                custom.andReturn(custom_path);
                p.update_www();
                expect(write).toHaveBeenCalled();
                expect(read.mostRecentCall.args[0]).toContain(custom_path);
            });
        });
        describe('update_overrides method', function() {
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
                config = spyOn(p, 'update_from_config');
                www = spyOn(p, 'update_www');
                overrides = spyOn(p, 'update_overrides');
                staging = spyOn(p, 'update_staging');
                svn = spyOn(util, 'deleteSvnFolders');
            });
            it('should call update_from_config', function() {
                p.update_project();
                expect(config).toHaveBeenCalled();
            });
            it('should throw if update_from_config throws', function(done) {
                var err = new Error('uh oh!');
                config.andCallFake(function() { throw err; });
                p.update_project({}, function(err) {
                    expect(err).toEqual(err);
                    done();
                });
            });
            it('should call update_www', function() {
                p.update_project();
                expect(www).toHaveBeenCalled();
            });
            it('should call update_overrides', function() {
                p.update_project();
                expect(overrides).toHaveBeenCalled();
            });
            it('should call update_staging', function() {
                p.update_project();
                expect(staging).toHaveBeenCalled();
            });
            it('should call deleteSvnFolders', function() {
                p.update_project();
                expect(svn).toHaveBeenCalled();
            });
        });
    });
});
