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
    child_process = require('child_process'),
    Q = require('q'),
    fs = require('fs'),
    ET = require('elementtree'),
    config = require('../../src/config'),
    config_parser = require('../../src/config_parser'),
    cordova = require('../../cordova');

describe('windows8 project parser', function() {

    var proj = '/some/path';
    var exists, exec, custom, readdir, cfg_parser;
    beforeEach(function() {
        exists = spyOn(fs, 'existsSync').andReturn(true);
        exec = spyOn(child_process, 'exec').andCallFake(function(cmd, opts, cb) {
            if (!cb) cb = opts;
            cb(null, '', '');
        });
        custom = spyOn(config, 'has_custom_path').andReturn(false);
        readdir = spyOn(fs, 'readdirSync').andReturn(['test.jsproj']);
        cfg_parser = spyOn(util, 'config_parser');
    });

    function wrapper(promise, done, post) {
        promise.then(post, function(err) {
            expect(err).toBeUndefined();
        }).fin(done);
    }

    function errorWrapper(promise, done, post) {
        promise.then(function() {
            expect('this call').toBe('fail');
        }, post).fin(done);
    }

    describe('constructions', function() {
        it('should throw if provided directory does not contain a jsproj file', function() {
            readdir.andReturn([]);
            expect(function() {
                new platforms.windows8.parser(proj);
            }).toThrow('The provided path "' + proj + '" is not a Windows 8 project. Error: No .jsproj file.');
        });
        it('should create an instance with path, manifest properties', function() {
            expect(function() {
                var parser = new platforms.windows8.parser(proj);
                expect(parser.windows8_proj_dir).toEqual(proj);
                expect(parser.manifest_path).toEqual(path.join(proj, 'package.appxmanifest'));
            }).not.toThrow();
        });
    });

    describe('check_requirements', function() {
        it('should fire a callback if there is an error during shelling out', function(done) {
            exec.andCallFake(function(cmd, opts, cb) {
                if (!cb) cb = opts;
                cb(50, 'there was an errorz!', '');
            });
            errorWrapper(platforms.windows8.parser.check_requirements(proj), done, function(err) {
                expect(err).toContain('there was an errorz!');
            });
        });
        it('should check by calling check_reqs on the stock lib path if no custom path is defined', function(done) {
            wrapper(platforms.windows8.parser.check_requirements(proj), done, function() {
                expect(exec.mostRecentCall.args[0]).toContain(util.libDirectory);
                expect(exec.mostRecentCall.args[0]).toMatch(/check_reqs"$/);
            });
        });
        it('should check by calling check_reqs on a custom path if it is so defined', function(done) {
            var custom_path = path.join('some','custom','path','to','windows8','lib');
            custom.andReturn(custom_path);
            wrapper(platforms.windows8.parser.check_requirements(proj),done, function() {
                expect(exec.mostRecentCall.args[0]).toContain(custom_path);
                expect(exec.mostRecentCall.args[0]).toMatch(/check_reqs"$/);
            });
            done();
        });
    });

    describe('instance', function() {
        var parser, cp, rm, is_cordova, write, read, mv, mkdir;
        var windows8_proj = path.join(proj, 'platforms', 'windows8');
        beforeEach(function() {
            parser = new platforms.windows8.parser(windows8_proj);
            cp = spyOn(shell, 'cp');
            rm = spyOn(shell, 'rm');
            mv = spyOn(shell, 'mv');
            mkdir = spyOn(shell, 'mkdir');
            is_cordova = spyOn(util, 'isCordova').andReturn(proj);
            write = spyOn(fs, 'writeFileSync');
            read = spyOn(fs, 'readFileSync').andReturn('');
        });

        describe('update_from_config method', function() {
            var et, xml, find, write_xml, root, cfg, find_obj, root_obj, cfg_access_add, cfg_access_rm, cfg_pref_add, cfg_pref_rm, cfg_content;
            beforeEach(function() {
                find_obj = {
                    text:'.//Application',
                    attrib:{
                        Id:'old',
                        Version:'0.0.0.0'
                    },
                    VisualElements:{
                        attrib:{
                            DisplayName:"old"
                        }
                    }
                };
                root_obj = {
                    attrib:{
                        package:'windows8_pkg'
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
                cfg = new config_parser();
                cfg.name = function() { return 'testname' };
                cfg.content = function() { return 'index.html' };
                cfg.packageName = function() { return 'testpkg' };
                cfg.version = function() { return 'one point oh' };
                cfg.access.get = function() { return [] };
                cfg.preference.get = function() { return [] };
                cfg_access_add = jasmine.createSpy('config_parser access add');
                cfg_access_rm = jasmine.createSpy('config_parser access rm');
                cfg_pref_rm = jasmine.createSpy('config_parser pref rm');
                cfg_pref_add = jasmine.createSpy('config_parser pref add');
                cfg_content = jasmine.createSpy('config_parser content');
                parser.config = {
                    access:{
                        remove:cfg_access_rm,
                        get:function(){},
                        add:cfg_access_add
                    },
                    content:cfg_content,
                    preference:{
                        remove:cfg_pref_rm,
                        get:function(){},
                        add:cfg_pref_add
                    }
                };
                readdir.andReturn(['test.sln']);
            });

            it('should write out the app name to package.appxmanifest', function() {
                parser.update_from_config(cfg);
                expect(find_obj.attrib.Name).toEqual(cfg.packageName());
                expect(find_obj.attrib.DisplayName).toEqual(cfg.name());
            });

            it('should write out the app version to package.appxmanifest', function() {
                parser.update_from_config(cfg);
                expect(find_obj.attrib.Version).toEqual('one point oh');
            });

            it('should update the content element (start page)', function() {
                parser.update_from_config(cfg);
                expect(cfg_content).toHaveBeenCalledWith('index.html');
            });

        });

        describe('www_dir method', function() {
            it('should return www', function() {
                expect(parser.www_dir()).toEqual(path.join(windows8_proj, 'www'));
            });
        });
        describe('staging_dir method', function() {
            it('should return .staging/www', function() {
                expect(parser.staging_dir()).toEqual(path.join(windows8_proj, '.staging', 'www'));
            });
        });
        describe('update_www method', function() {
            var update_jsproj;
            beforeEach(function() {
                update_jsproj = spyOn(parser, 'update_jsproj');
            });
            it('should rm project-level www and cp in platform agnostic www', function() {
                parser.update_www(path.join('lib','dir'));
                expect(rm).toHaveBeenCalled();
                expect(cp).toHaveBeenCalled();
            });
        });
        describe('update_staging method', function() {
            it('should do nothing if staging dir does not exist', function() {
                exists.andReturn(false);
                parser.update_staging();
                expect(cp).not.toHaveBeenCalled();
            });
            it('should copy the staging dir into www if staging dir exists', function() {
                parser.update_staging();
                expect(cp).toHaveBeenCalled();
            });
        });
        describe('update_project method', function() {
            var config, www, overrides, staging, svn;
            beforeEach(function() {
                config = spyOn(parser, 'update_from_config');
                www = spyOn(parser, 'update_www');
                www = spyOn(parser, 'update_jsproj');
                staging = spyOn(parser, 'update_staging');
                svn = spyOn(util, 'deleteSvnFolders');
                exists.andReturn(false);
            });
            it('should call update_from_config', function() {
                parser.update_project();
                expect(config).toHaveBeenCalled();
            });
            it('should throw if update_from_config throws', function(done) {
                var err = new Error('uh oh!');
                config.andCallFake(function() { throw err; });
                errorWrapper(parser.update_project({}), done, function(err) {
                    expect(err).toEqual(err);
                });
            });
            it('should call update_staging', function(done) {
                wrapper(parser.update_project(), done, function() {
                    expect(staging).toHaveBeenCalled();
                });
            });
            it('should call deleteSvnFolders', function(done) {
                wrapper(parser.update_project(), done, function() {
                    expect(svn).toHaveBeenCalled();
                });
            });
        });
    });
});
