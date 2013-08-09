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

describe('build command', function() {
    var is_cordova, list_platforms, fire;
    var project_dir = '/some/path';
    var prepare_spy, compile_spy;
    beforeEach(function() {
        is_cordova = spyOn(util, 'isCordova').andReturn(project_dir);
        list_platforms = spyOn(util, 'listPlatforms').andReturn(supported_platforms);
        fire = spyOn(hooker.prototype, 'fire').andCallFake(function(e, opts, cb) {
            cb(false);
        });
        prepare_spy = spyOn(cordova, 'prepare').andCallFake(function(platforms, cb) {
            cb();
        });
        compile_spy = spyOn(cordova, 'compile').andCallFake(function(platforms, cb) {
            cb();
        });
    });
    describe('failure', function() {
        it('should not run inside a Cordova-based project with no added platforms by calling util.listPlatforms', function() {
            list_platforms.andReturn([]);
            expect(function() {
                cordova.build();
            }).toThrow('No platforms added to this project. Please use `cordova platform add <platform>`.');
        });
        it('should not run outside of a Cordova-based project', function() {
            is_cordova.andReturn(false);
            expect(function() {
                cordova.build();
            }).toThrow('Current working directory is not a Cordova-based project.');
        });
    });

    describe('success', function() {
        it('should run inside a Cordova-based project with at least one added platform and call both prepare and compile', function(done) {
            cordova.build(['android','ios'], function(err) {
                expect(prepare_spy).toHaveBeenCalledWith({verbose: false, platforms: ['android', 'ios'], options: []}, jasmine.any(Function));
                expect(compile_spy).toHaveBeenCalledWith({verbose: false, platforms: ['android', 'ios'], options: []}, jasmine.any(Function));
                done();
            });
        });
        it('should pass down options', function(done) {
            cordova.build({platforms: ['android'], options: ['--release']}, function(err) {
                expect(prepare_spy).toHaveBeenCalledWith({platforms: ['android'], options: ["--release"]}, jasmine.any(Function));
                expect(compile_spy).toHaveBeenCalledWith({platforms: ['android'], options: ["--release"]}, jasmine.any(Function));
                done();
            });
        });
    });

    describe('hooks', function() {
        describe('when platforms are added', function() {
            it('should fire before hooks through the hooker module', function() {
                cordova.build(['android', 'ios']);
                expect(fire).toHaveBeenCalledWith('before_build', {verbose: false, platforms:['android', 'ios'], options: []}, jasmine.any(Function));
            });
            it('should fire after hooks through the hooker module', function(done) {
                cordova.build('android', function() {
                     expect(fire).toHaveBeenCalledWith('after_build', {verbose: false, platforms:['android'], options: []}, jasmine.any(Function));
                     done();
                });
            });
        });

        describe('with no platforms added', function() {
            it('should not fire the hooker', function() {
                list_platforms.andReturn([]);
                expect(function() {
                    cordova.build();
                }).toThrow();
                expect(fire).not.toHaveBeenCalled();
            });
        });
    });
});
