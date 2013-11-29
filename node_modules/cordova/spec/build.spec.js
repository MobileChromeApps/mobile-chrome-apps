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
    Q = require('q'),
    util = require('../src/util');

var supported_platforms = Object.keys(platforms).filter(function(p) { return p != 'www'; });

describe('build command', function() {
    var is_cordova, cd_project_root, list_platforms, fire;
    var project_dir = '/some/path';
    var prepare_spy, compile_spy;
    var result;

    function buildPromise(f) {
        f.then(function() { result = true; }, function(err) { result = err; });
    }

    function wrapper(f, post) {
        runs(function() {
            buildPromise(f);
        });
        waitsFor(function() { return result; }, 'promise never resolved', 500);
        runs(post);
    }

    beforeEach(function() {
        is_cordova = spyOn(util, 'isCordova').andReturn(project_dir);
        cd_project_root = spyOn(util, 'cdProjectRoot').andReturn(project_dir);
        list_platforms = spyOn(util, 'listPlatforms').andReturn(supported_platforms);
        fire = spyOn(hooker.prototype, 'fire').andReturn(Q());
        prepare_spy = spyOn(cordova.raw, 'prepare').andReturn(Q());
        compile_spy = spyOn(cordova.raw, 'compile').andReturn(Q());
    });
    describe('failure', function(done) {
        it('should not run inside a Cordova-based project with no added platforms by calling util.listPlatforms', function() {
            list_platforms.andReturn([]);
            runs(function() {
                buildPromise(cordova.raw.build());
            });
            waitsFor(function() { return result; }, 'promise never resolved', 500);
            runs(function() {
                expect(result).toEqual(new Error('No platforms added to this project. Please use `cordova platform add <platform>`.'));
            });
        });
        it('should not run outside of a Cordova-based project', function() {
            is_cordova.andReturn(false);
            wrapper(cordova.raw.build(), function() {
                expect(result).toEqual(new Error('Current working directory is not a Cordova-based project.'));
            });
        });
    });

    describe('success', function() {
        it('should run inside a Cordova-based project with at least one added platform and call both prepare and compile', function(done) {
            cordova.raw.build(['android','ios']).then(function() {
                expect(prepare_spy).toHaveBeenCalledWith({verbose: false, platforms: ['android', 'ios'], options: []});
                expect(compile_spy).toHaveBeenCalledWith({verbose: false, platforms: ['android', 'ios'], options: []});
                done();
            });
        });
        it('should pass down options', function(done) {
            cordova.raw.build({platforms: ['android'], options: ['--release']}).then(function() {
                expect(prepare_spy).toHaveBeenCalledWith({platforms: ['android'], options: ["--release"]});
                expect(compile_spy).toHaveBeenCalledWith({platforms: ['android'], options: ["--release"]});
                done();
            });
        });
    });

    describe('hooks', function() {
        describe('when platforms are added', function() {
            it('should fire before hooks through the hooker module', function(done) {
                cordova.raw.build(['android', 'ios']).then(function() {
                    expect(fire).toHaveBeenCalledWith('before_build', {verbose: false, platforms:['android', 'ios'], options: []});
                    done();
                });
            });
            it('should fire after hooks through the hooker module', function(done) {
                cordova.raw.build('android').then(function() {
                     expect(fire).toHaveBeenCalledWith('after_build', {verbose: false, platforms:['android'], options: []});
                     done();
                });
            });
        });

        describe('with no platforms added', function() {
            it('should not fire the hooker', function() {
                list_platforms.andReturn([]);
                wrapper(cordova.raw.build(), function() {
                    expect(result).toEqual(new Error('No platforms added to this project. Please use `cordova platform add <platform>`.'));
                    expect(fire).not.toHaveBeenCalled();
                });
            });
        });
    });
});
