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
var path = require('path'),
    fs = require('fs'),
    shell = require('shelljs'),
    config_parser = require('../src/config_parser'),
    et = require('elementtree'),
    xml = path.join(__dirname, '..', 'templates', 'config.xml'),
    util = require('../src/util');

var xml_contents = fs.readFileSync(xml, 'utf-8');

describe('config.xml parser', function () {
    var readFile, update;
    beforeEach(function() {
        readFile = spyOn(fs, 'readFileSync').andReturn(xml_contents);
        update = spyOn(config_parser.prototype, 'update');
    });

    it('should create an instance based on an xml file', function() {
        var cfg;
        expect(function () {
            cfg = new config_parser(xml);
        }).not.toThrow();
        expect(cfg).toBeDefined();
        expect(cfg.doc).toBeDefined();
    });
    
    describe('methods', function() {
        var cfg;
        beforeEach(function() {
            cfg = new config_parser(xml);
        });

        describe('package name / id', function() {
            it('should get the (default) packagename', function() {
                expect(cfg.packageName()).toEqual('io.cordova.hellocordova');
            });
            it('should allow setting the packagename', function() {
                cfg.packageName('this.is.bat.country');
                expect(cfg.packageName()).toEqual('this.is.bat.country');
            });
            it('should write to disk after setting the packagename', function() {
                cfg.packageName('this.is.bat.country');
                expect(update).toHaveBeenCalled();
            });
        });

        describe('version', function() {
            it('should get the version', function() {
                expect(cfg.version()).toEqual('0.0.1');
            });
            it('should allow setting the version', function() {
                cfg.version('2.0.1');
                expect(cfg.version()).toEqual('2.0.1');
            });
            it('should write to disk after setting the version', function() {
                cfg.version('2.0.1');
                expect(update).toHaveBeenCalled();
            });
        });

        describe('content', function() {
            it('should get the content src attribute', function() {
                expect(cfg.content()).toEqual('index.html');
            });
            it('should allow setting the content src attribute', function() {
                cfg.content('main.html');
                expect(cfg.content()).toEqual('main.html');
            });
            it('should write to disk after setting the content', function() {
                cfg.content('batman.html');
                expect(update).toHaveBeenCalled();
            });
        });

        describe('app name', function() {
            it('should get the (default) app name', function() {
                expect(cfg.name()).toEqual('Hello Cordova');
            });
            it('should allow setting the app name', function() {
                cfg.name('this.is.bat.country');
                expect(cfg.name()).toEqual('this.is.bat.country');
            });
            it('should write to disk after setting the name', function() {
                cfg.name('one toke over the line');
                expect(update).toHaveBeenCalled();
            });
        });

        describe('access elements (whitelist)', function() {
            describe('getter', function() {
                it('should get the (default) access element', function() {
                    expect(cfg.access.get()[0]).toEqual('*');
                });
                it('should return an array of all access origin uris via access()', function() {
                    expect(cfg.access.get() instanceof Array).toBe(true);
                });
            });
            describe('setters', function() {
                it('should allow removing a uri from the access list', function() {
                    cfg.access.remove('*');
                    expect(cfg.access.get().length).toEqual(0);
                });
                it('should write to disk after removing a uri', function() {
                    cfg.access.remove('*');
                    expect(update).toHaveBeenCalled();
                });
                it('should allow adding a new uri to the access list', function() {
                    cfg.access.add('http://canucks.com');
                    expect(cfg.access.get().length).toEqual(2);
                    expect(cfg.access.get().indexOf('http://canucks.com') > -1).toBe(true);
                });
                it('should write to disk after adding a uri', function() {
                    cfg.access.add('http://cordova.io');
                    expect(update).toHaveBeenCalled();
                });
                it('should allow removing all access elements when no parameter is specified', function() {
                    cfg.access.add('http://cordova.io');
                    cfg.access.remove();
                    expect(cfg.access.get().length).toEqual(0);
                });
            });
        });

        describe('preference elements', function() {
            describe('getter', function() {
                it('should get all preference elements', function() {
                    expect(cfg.preference.get()[0].name).toEqual('fullscreen');
                    expect(cfg.preference.get()[0].value).toEqual('true');
                });
                it('should return an array of all preference name/value pairs', function() {
                    expect(cfg.preference.get() instanceof Array).toBe(true);
                });
            });
            describe('setters', function() {
                it('should allow removing a preference by name', function() {
                    cfg.preference.remove('fullscreen');
                    expect(cfg.preference.get().length).toEqual(1);
                });
                it('should write to disk after removing a preference', function() {
                    cfg.preference.remove('phonegap-version');
                    expect(fs.readFileSync(xml, 'utf-8')).not.toMatch(/<preference\sname="phonegap-version"/);
                });
                it('should allow adding a new preference', function() {
                    cfg.preference.add({name:'UIWebViewBounce',value:'false'});
                    expect(cfg.preference.get().length).toEqual(3);
                    expect(cfg.preference.get()[2].value).toEqual('false');
                });
                it('should write to disk after adding a preference', function() {
                    cfg.preference.add({name:'UIWebViewBounce',value:'false'});
                    expect(update).toHaveBeenCalled();
                });
                it('should allow removing all preference elements when no parameter is specified', function() {
                    cfg.preference.remove();
                    expect(cfg.preference.get().length).toEqual(0);
                });
            });
        });
    });
});
