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
    child_process = require('child_process'),
    path = require('path'),
    fs = require('fs'),
    hooker = require('../src/hooker'),
    Q = require('q'),
    util = require('../src/util'),
    os = require('os');


var supported_platforms = Object.keys(platforms).filter(function(p) { return p != 'www'; });


describe('compile command', function() {
    var is_cordova, list_platforms, fire, result, child, spawn_wrap, cd_project_root;
    var project_dir = '/some/path';
    child = {
        on: function(child_event,cb){
            if(child_event === 'close'){
                cb(0);
            }
        },
        stdout: {
            setEncoding: function(){},
            on: function(){}
        },
        stderr: {
            setEncoding: function(){},
            on: function(){}
        }
    };
    spawn_wrap = function(cmd,args,options){
        var _cmd = cmd,
            _args = args;

        if (os.platform() === 'win32') {
            _args = ['/c',_cmd].concat(_args);
            _cmd = 'cmd';
        }

        return {
                    "cmd": _cmd,
                    "args": _args,
                    "options": options
                };
    };

    function wrapper(f, post) {
        runs(function() {
            f.then(function() { result = true; }, function(err) { result = err; });
        });
        waitsFor(function() { return result; }, 'promise never resolved', 500);
        runs(post);
    }
    beforeEach(function() {
        is_cordova = spyOn(util, 'isCordova').andReturn(project_dir);
        cd_project_root = spyOn(util, 'cdProjectRoot').andReturn(project_dir);
        list_platforms = spyOn(util, 'listPlatforms').andReturn(supported_platforms);
        fire = spyOn(hooker.prototype, 'fire').andReturn(Q());
        spyOn(child_process, 'spawn').andReturn(child);
    });
    describe('failure', function() {
        it('should not run inside a Cordova-based project with no added platforms by calling util.listPlatforms', function() {
            list_platforms.andReturn([]);
            wrapper(cordova.raw.compile(), function() {
                expect(result).toEqual(new Error('No platforms added to this project. Please use `cordova platform add <platform>`.'));
            });
        });
        it('should not run outside of a Cordova-based project', function() {
            is_cordova.andReturn(false);
            wrapper(cordova.raw.compile(), function() {
                expect(result).toEqual(new Error('Current working directory is not a Cordova-based project.'));
            });
        });
    });

    describe('success', function() {
        var spawn_call;
        it('should run inside a Cordova-based project with at least one added platform and shell out to build', function(done) {
            cordova.raw.compile(['android','ios']).then(function() {
                spawn_call = spawn_wrap(path.join(project_dir, 'platforms', 'android', 'cordova', 'build'),[]);
                expect(child_process.spawn).toHaveBeenCalledWith(spawn_call.cmd, spawn_call.args);

                spawn_call = spawn_wrap(path.join(project_dir, 'platforms', 'ios', 'cordova', 'build'),[]);
                expect(child_process.spawn).toHaveBeenCalledWith(spawn_call.cmd, spawn_call.args);

                done();
            });
        });

        it('should pass down optional parameters', function (done) {
            cordova.raw.compile({platforms:["blackberry10"], options:["--release"]}).then(function () {
                spawn_call = spawn_wrap(path.join(project_dir, 'platforms', 'blackberry10', 'cordova', 'build'),['--release']);
                expect(child_process.spawn).toHaveBeenCalledWith(spawn_call.cmd, spawn_call.args);

                done();
            });
        });
    });

    describe('hooks', function() {
        describe('when platforms are added', function() {
            it('should fire before hooks through the hooker module', function(done) {
                cordova.raw.compile(['android', 'ios']).then(function() {
                    expect(fire).toHaveBeenCalledWith('before_compile', {verbose: false, platforms:['android', 'ios'], options: []});
                    done();
                });
            });
            it('should fire after hooks through the hooker module', function(done) {
                cordova.raw.compile('android').then(function() {
                     expect(fire).toHaveBeenCalledWith('after_compile', {verbose: false, platforms:['android'], options: []});
                     done();
                });
            });
        });

        describe('with no platforms added', function() {
            it('should not fire the hooker', function() {
                list_platforms.andReturn([]);
                wrapper(cordova.raw.compile(), function() {
                    expect(result).toEqual(new Error('No platforms added to this project. Please use `cordova platform add <platform>`.'));
                    expect(fire).not.toHaveBeenCalled();
                });
            });
        });
    });
});
