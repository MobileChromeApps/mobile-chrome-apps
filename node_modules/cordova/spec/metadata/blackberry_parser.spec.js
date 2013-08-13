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
    prompt = require('prompt'),
    config_parser = require('../../src/config_parser'),
    cordova = require('../../cordova');

describe('blackberry10 project parser', function() {
    var proj = '/some/path';
    var exists, custom, config_p, sh;
    beforeEach(function() {
        exists = spyOn(fs, 'existsSync').andReturn(true);
        custom = spyOn(config, 'has_custom_path').andReturn(false);
        config_p = spyOn(util, 'config_parser');
        sh = spyOn(shell, 'exec').andCallFake(function(cmd, opts, cb) {
            cb(0, '');
        });
    });

    describe('constructions', function() {
        it('should throw an exception with a path that is not a native blackberry project', function() {
            exists.andReturn(false);
            expect(function() {
                new platforms.blackberry10.parser(proj);
            }).toThrow('The provided path "/some/path" is not a Cordova BlackBerry10 project.');
        });
        it('should accept a proper native blackberry project path as construction parameter', function() {
            var project;
            expect(function() {
                project = new platforms.blackberry10.parser(proj);
            }).not.toThrow();
            expect(project).toBeDefined();
        });
    });

    describe('check_requirements', function() {
        it('should fire a callback if the blackberry-deploy shell-out fails', function(done) {
            sh.andCallFake(function(cmd, opts, cb) {
                cb(1, 'no bb-deploy dewd!');
            });
            platforms.blackberry10.parser.check_requirements(proj, function(err) {
                expect(err).toContain('no bb-deploy dewd');
                done();
            });
        });
        it('should fire a callback with no error if shell out is successful', function(done) {
            platforms.blackberry10.parser.check_requirements(proj, function(err) {
                expect(err).toEqual(false);
                done();
            });
        });
    });
    describe('instance', function() {
        var p, cp, rm, is_cordova, write, read;
        var bb_proj = path.join(proj, 'platforms', 'blackberry10');
        beforeEach(function() {
            p = new platforms.blackberry10.parser(bb_proj);
            cp = spyOn(shell, 'cp');
            rm = spyOn(shell, 'rm');
            is_cordova = spyOn(util, 'isCordova').andReturn(proj);
            write = spyOn(fs, 'writeFileSync');
            read = spyOn(fs, 'readFileSync');
        });

        describe('update_from_config method', function() {
            var et, xml, find, write_xml, root, cfg, find_obj, root_obj;
            var xml_name, xml_pkg, xml_version, xml_access_rm, xml_update, xml_append, xml_content;
            beforeEach(function() {
                xml_content = jasmine.createSpy('xml content');
                xml_name = jasmine.createSpy('xml name');
                xml_pkg = jasmine.createSpy('xml pkg');
                xml_version = jasmine.createSpy('xml version');
                xml_access_rm = jasmine.createSpy('xml access rm');
                xml_access_add = jasmine.createSpy('xml access add');
                xml_update = jasmine.createSpy('xml update');
                xml_append = jasmine.createSpy('xml append');
                p.xml.name = xml_name;
                p.xml.packageName = xml_pkg;
                p.xml.version = xml_version;
                p.xml.content = xml_content;
                p.xml.access = {
                    remove:xml_access_rm,
                    add: xml_access_add
                };
                p.xml.update = xml_update;
                p.xml.doc = {
                    getroot:function() { return { append:xml_append}; }
                };
                find_obj = {
                    text:'hi'
                };
                root_obj = {
                    attrib:{
                        package:'bb_pkg'
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
                cfg.name = function() { return 'testname'; };
                cfg.content = function() { return 'index.html'; };
                cfg.packageName = function() { return 'testpkg'; };
                cfg.version = function() { return 'one point oh'; };
                cfg.access.getAttributes = function() { return []; };
                cfg.preference.get = function() { return []; };
            });

            it('should write out the app name to config.xml', function() {
                p.update_from_config(cfg);
                expect(xml_name).toHaveBeenCalledWith('testname');
            });
            it('should write out the app id to bb\'s config.xml', function() {
                p.update_from_config(cfg);
                expect(xml_pkg).toHaveBeenCalledWith('testpkg');
            });
            it('should write out the app version to bb\'s config.xml', function() {
                p.update_from_config(cfg);
                expect(xml_version).toHaveBeenCalledWith('one point oh');
            });
            it('should wipe out the bb config.xml whitelist every time', function() {
                p.update_from_config(cfg);
                expect(xml_access_rm).toHaveBeenCalled();
            });
            it('should update the whitelist', function() {
                cfg.access.getAttributes = function() { return [{origin: 'one'},{uri: "two", subdomains: "false"}]; };
                p.update_from_config(cfg);
                expect(xml_access_add).toHaveBeenCalledWith('one', undefined);
                expect(xml_access_add).toHaveBeenCalledWith('two', 'false');
            });
            it('should update the start page (content tag)', function() {
                p.update_from_config(cfg);
                expect(xml_content).toHaveBeenCalledWith('index.html');
            });
        });
        describe('www_dir method', function() {
            it('should return /www', function() {
                expect(p.www_dir()).toEqual(path.join(bb_proj, 'www'));
            });
        });
        describe('staging_dir method', function() {
            it('should return .staging/www', function() {
                expect(p.staging_dir()).toEqual(path.join(bb_proj, '.staging', 'www'));
            });
        });
        describe('config_xml method', function() {
            it('should return the location of the config.xml', function() {
                expect(p.config_xml()).toEqual(path.join(proj, 'platforms', 'blackberry10', 'www', 'config.xml'));
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
                expect(cp).toHaveBeenCalledWith('-f', path.join(util.libDirectory, 'blackberry10', 'cordova', platforms.blackberry10.version, 'javascript', 'cordova.blackberry10.js'), path.join(proj, 'platforms', 'blackberry10', 'www', 'cordova.js'));
            });
            it('should copy in a fresh cordova.js from custom cordova lib if custom lib is specified', function() {
                var custom_path = '/custom/path';
                custom.andReturn(custom_path);
                p.update_www();
                expect(cp).toHaveBeenCalledWith('-f', path.join(custom_path, 'javascript', 'cordova.blackberry10.js'), path.join(proj, 'platforms', 'blackberry10', 'www', 'cordova.js'));
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
                expect(cp).toHaveBeenCalledWith('-rf', path.join(proj, 'merges', 'blackberry10', '*'), path.join(proj, 'platforms', 'blackberry10', 'www'));
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
                expect(cp).toHaveBeenCalledWith('-rf', path.join(proj, 'platforms', 'blackberry10', '.staging', 'www', '*'), path.join(proj, 'platforms', 'blackberry10', 'www'));
            });
        });
        describe('update_project method', function() {
            var config, www, overrides, staging, svn, parse, get_env, write_env;
            beforeEach(function() {
                config = spyOn(p, 'update_from_config');
                www = spyOn(p, 'update_www');
                overrides = spyOn(p, 'update_overrides');
                staging = spyOn(p, 'update_staging');
                svn = spyOn(util, 'deleteSvnFolders');
                parse = spyOn(JSON, 'parse').andReturn({blackberry:{qnx:{}}});
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
