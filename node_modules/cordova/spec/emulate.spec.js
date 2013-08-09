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
    platforms = require('../platforms'),
    shell = require('shelljs'),
    path = require('path'),
    fs = require('fs'),
    hooker = require('../src/hooker'),
    util = require('../src/util');

var supported_platforms = Object.keys(platforms).filter(function(p) { return p != 'www'; });

describe('emulate command', function() {
    var is_cordova, list_platforms, fire, exec;
    var project_dir = '/some/path';
    var prepare_spy;
    beforeEach(function() {
        is_cordova = spyOn(util, 'isCordova').andReturn(project_dir);
        list_platforms = spyOn(util, 'listPlatforms').andReturn(supported_platforms);
        fire = spyOn(hooker.prototype, 'fire').andCallFake(function(e, opts, cb) {
            cb(false);
        });
        prepare_spy = spyOn(cordova, 'prepare').andCallFake(function(platforms, cb) {
            cb();
        });
        exec = spyOn(shell, 'exec').andCallFake(function(cmd, opts, cb) { cb(0, ''); });
    });
    describe('failure', function() {
        it('should not run inside a Cordova-based project with no added platforms by calling util.listPlatforms', function() {
            list_platforms.andReturn([]);
            expect(function() {
                cordova.emulate();
            }).toThrow('No platforms added to this project. Please use `cordova platform add <platform>`.');
        });
        it('should not run outside of a Cordova-based project', function() {
            is_cordova.andReturn(false);
            expect(function() {
                cordova.emulate();
            }).toThrow('Current working directory is not a Cordova-based project.');
        });
    });

    describe('success', function() {
        it('should run inside a Cordova-based project with at least one added platform and call prepare and shell out to the emulate script', function(done) {
            cordova.emulate(['android','ios'], function(err) {
                expect(prepare_spy).toHaveBeenCalledWith(['android', 'ios'], jasmine.any(Function));
                expect(exec).toHaveBeenCalledWith('"' + path.join(project_dir, 'platforms', 'android', 'cordova', 'run') + '" --emulator', jasmine.any(Object), jasmine.any(Function));
                expect(exec).toHaveBeenCalledWith('"' + path.join(project_dir, 'platforms', 'ios', 'cordova', 'run') + '" --emulator', jasmine.any(Object), jasmine.any(Function));
                done();
            });
        });
        it('should pass down options', function(done) {
            cordova.emulate({platforms: ['ios'], options:["--optionTastic"]}, function(err) {
                expect(prepare_spy).toHaveBeenCalledWith(['ios'], jasmine.any(Function));
                expect(exec).toHaveBeenCalledWith('"' + path.join(project_dir, 'platforms', 'ios', 'cordova', 'run') + '" --optionTastic', jasmine.any(Object), jasmine.any(Function));
                done();
            });
        });
    });

    describe('hooks', function() {
        describe('when platforms are added', function() {
            it('should fire before hooks through the hooker module', function() {
                cordova.emulate(['android', 'ios']);
                expect(fire).toHaveBeenCalledWith('before_emulate', {verbose: false, platforms:['android', 'ios'], options: []}, jasmine.any(Function));
            });
            it('should fire after hooks through the hooker module', function(done) {
                cordova.emulate('android', function() {
                     expect(fire).toHaveBeenCalledWith('after_emulate', {verbose: false, platforms:['android'], options: []}, jasmine.any(Function));
                     done();
                });
            });
        });

        describe('with no platforms added', function() {
            it('should not fire the hooker', function() {
                list_platforms.andReturn([]);
                expect(function() {
                    cordova.emulate();
                }).toThrow();
                expect(fire).not.toHaveBeenCalled();
            });
        });
    });
});
