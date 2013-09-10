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
    fs = require('fs'),
    plugin_parser = require('../src/plugin_parser'),
    et = require('elementtree'),
    xml = path.join(__dirname, 'fixtures', 'plugins', 'test', 'plugin.xml');

var xml_contents = fs.readFileSync(xml, 'utf-8');

describe('plugin.xml parser', function () {
    var readfile;
    beforeEach(function() {
        readfile = spyOn(fs, 'readFileSync').andReturn(xml_contents);
    });

    it('should read a proper plugin.xml file', function() {
        var cfg;
        expect(function () {
            cfg = new plugin_parser(xml);
        }).not.toThrow();
        expect(cfg).toBeDefined();
        expect(cfg.doc).toBeDefined();
    });
    it('should be able to figure out which platforms the plugin supports', function() {
        var cfg = new plugin_parser(xml);
        expect(cfg.platforms.length).toBe(1);
        expect(cfg.platforms.indexOf('ios') > -1).toBe(true);
    });
});

