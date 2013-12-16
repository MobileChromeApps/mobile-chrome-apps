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
    xml = path.join(__dirname, 'test-config.xml'),
    util = require('../src/util'),
    xml_contents = fs.readFileSync(xml, 'utf-8');

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

        describe('merge_with', function () {
            it("should merge attributes and text of the root element without clobbering", function () {
                var testXML = new et.ElementTree(et.XML("<widget foo='bar' id='NOTANID'>TEXT</widget>"));
                cfg.merge_with({doc: testXML});
                expect(cfg.doc.getroot().attrib.foo).toEqual("bar");
                expect(cfg.doc.getroot().attrib.id).not.toEqual("NOTANID");
                expect(cfg.doc.getroot().text).not.toEqual("TEXT");
            });

            it("should merge attributes and text of the root element with clobbering", function () {
                var testXML = new et.ElementTree(et.XML("<widget foo='bar' id='NOTANID'>TEXT</widget>"));
                cfg.merge_with({doc: testXML}, "foo", true);
                expect(cfg.doc.getroot().attrib.foo).toEqual("bar");
                expect(cfg.doc.getroot().attrib.id).toEqual("NOTANID");
                expect(cfg.doc.getroot().text).toEqual("TEXT");
            });

            it("should not merge platform tags with the wrong platform", function () {
                var testXML = new et.ElementTree(et.XML("<widget><platform name='bar'><testElement testAttrib='value'>testTEXT</testElement></platform></widget>")),
                    origCfg = et.tostring(cfg.doc.getroot());

                cfg.merge_with({doc: testXML}, "foo", true);
                expect(et.tostring(cfg.doc.getroot())).toEqual(origCfg);
            });

            it("should merge platform tags with the correct platform", function () {
                var testXML = new et.ElementTree(et.XML("<widget><platform name='bar'><testElement testAttrib='value'>testTEXT</testElement></platform></widget>")),
                    origCfg = et.tostring(cfg.doc.getroot()),
                    testElement;

                cfg.merge_with({doc: testXML}, "bar", true);
                expect(et.tostring(cfg.doc.getroot())).not.toEqual(origCfg);
                testElement = cfg.doc.getroot().find("testElement");
                expect(testElement).toBeDefined();
                expect(testElement.attrib.testAttrib).toEqual("value");
                expect(testElement.text).toEqual("testTEXT");
            });

            it("should merge singelton children without clobber", function () {
                var testXML = new et.ElementTree(et.XML("<widget><author testAttrib='value' href='http://www.nowhere.com'>SUPER_AUTHOR</author></widget>")),
                    testElements;

                cfg.merge_with({doc: testXML});
                testElements = cfg.doc.getroot().findall("author");
                expect(testElements).toBeDefined();
                expect(testElements.length).toEqual(1);
                expect(testElements[0].attrib.testAttrib).toEqual("value");
                expect(testElements[0].attrib.href).toEqual("http://cordova.io");
                expect(testElements[0].attrib.email).toEqual("dev@cordova.apache.org");
                expect(testElements[0].text).toContain("Apache Cordova Team");
            });

            it("should clobber singelton children with clobber", function () {
                var testXML = new et.ElementTree(et.XML("<widget><author testAttrib='value' href='http://www.nowhere.com'>SUPER_AUTHOR</author></widget>")),
                    testElements;

                cfg.merge_with({doc: testXML}, "", true);
                testElements = cfg.doc.getroot().findall("author");
                expect(testElements).toBeDefined();
                expect(testElements.length).toEqual(1);
                expect(testElements[0].attrib.testAttrib).toEqual("value");
                expect(testElements[0].attrib.href).toEqual("http://www.nowhere.com");
                expect(testElements[0].attrib.email).toEqual("dev@cordova.apache.org");
                expect(testElements[0].text).toEqual("SUPER_AUTHOR");
            });

            it("should append non singelton children", function () {
                var testXML = new et.ElementTree(et.XML("<widget><preference num='1'/> <preference num='2'/></widget>")),
                    testElements;

                cfg.merge_with({doc: testXML}, "", true);
                testElements = cfg.doc.getroot().findall("preference");
                expect(testElements.length).toEqual(4);
            });

            it("should handle namespaced elements", function () {
                var testXML = new et.ElementTree(et.XML("<widget><foo:bar testAttrib='value'>testText</foo:bar></widget>")),
                    testElement;

                cfg.merge_with({doc: testXML}, "foo", true);
                testElement = cfg.doc.getroot().find("foo:bar");
                expect(testElement).toBeDefined();
                expect(testElement.attrib.testAttrib).toEqual("value");
                expect(testElement.text).toEqual("testText");
            });

            it("should not append duplicate non singelton children", function () {
                var testXML = new et.ElementTree(et.XML("<widget><preference name='fullscreen' value='true'/></widget>")),
                    testElements;

                cfg.merge_with({doc: testXML}, "", true);
                testElements = cfg.doc.getroot().findall("preference");
                expect(testElements.length).toEqual(2);
            });
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
            it('should not error out if there is no content element', function () {
                readFile.andCallThrough();
                var no_content_xml = path.join(__dirname, "fixtures", "templates", "no_content_config.xml"),
                    no_content_xml_contents = fs.readFileSync(no_content_xml, "utf-8");
                readFile.andReturn(no_content_xml_contents);
                var no_content_cfg = new config_parser(no_content_xml);
                expect(no_content_cfg.content()).toEqual('index.html');
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
