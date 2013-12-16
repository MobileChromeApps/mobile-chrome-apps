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

var helpers = require('./helpers'),
    path = require('path'),
    fs = require('fs'),
    shell = require('shelljs'),
    Q = require('q'),
    config = require('../src/config'),
    events = require('../src/events'),
    util = require('../src/util'),
    cordova = require('../cordova');

// A utility function to generate all combinations of elements from 2 arrays.
// crossConcat(['x', 'y'], ['1', '2', '3'])
// -> [ 'x1', 'x2', 'x3', 'y1', 'y2', 'y3']
var crossConcat = function(a, b, delimiter){
    var result = [];
    delimiter = delimiter || '';
    for (var i = 0; i < a.length; i++) {
        for (var j = 0; j < b.length; j++) {
            result.push(a[i] + delimiter + b[j]);
        }
    }
    return result;
};

var tmpDir = helpers.tmpDir('create_test');
var appName = 'TestCreate';
var appId = 'io.cordova.' + appName.toLocaleLowerCase();
var project = path.join(tmpDir, appName);
var cordovaDir = path.join(project, '.cordova');
var extraConfig = {
      lib: {
        www: {
          uri: path.join(__dirname, 'fixtures', 'base', 'www'),
          version: "testCordovaCreate",
          id: appName
        }
      }
    };

describe('create end-to-end', function() {

    beforeEach(function() {
        shell.rm('-rf', project);
    });
    afterEach(function() {
        process.chdir(path.join(__dirname, '..'));  // Needed to rm the dir on Windows.
        shell.rm('-rf', tmpDir);
    });

    var results;
    events.on('results', function(res) { results = res; });

    it('should successfully run', function(done) {
        // Call cordova create with no args, should return help.
        cordova.raw.create().then(function() {
            expect(results).toMatch(/synopsis/gi);
        }).then(function() {
            // Create a real project
            return cordova.raw.create(project, appId, appName, extraConfig);
        }).then(function() {
            // Check if top level dirs exist.
            var dirs = ['.cordova', 'platforms', 'merges', 'plugins', 'www'];
            dirs.forEach(function(d) {
                expect(path.join(project, d)).toExist();
            });

            // Check if hook dirs exist.
            var hooksDir = path.join(project, '.cordova', 'hooks');
            dirs = crossConcat(['platform', 'plugin'], ['add', 'rm', 'ls'], '_');
            dirs = dirs.concat(['build', 'compile', 'docs', 'emulate', 'prepare', 'run']);
            dirs = crossConcat(['before', 'after'], dirs, '_');
            dirs.forEach(function(d) {
                expect(path.join(hooksDir, d)).toExist();
            });

            // Check if config files exist.
            expect(path.join(cordovaDir, 'config.json')).toExist();
            expect(path.join(project, 'www', 'config.xml')).toExist();

            // Check contents of config.json
            var cfg = config.read(project);
            expect(cfg.id).toEqual(appId);
            expect(cfg.name).toEqual(appName);
            expect(cfg.lib.www.id).toEqual(appName);

            // Check that www/config.xml was updated.
            var configXml = new util.config_parser(path.join(project, 'www', 'config.xml'));
            expect(configXml.packageName()).toEqual(appId);

            // TODO (kamrik): check somehow that we got the right config.xml from the fixture and not some place else.
            // expect(configXml.name()).toEqual('TestBase');
        }).fail(function(err) {
            console.log(err);
            expect(err).toBeUndefined();
        }).fin(done);
    });
});
