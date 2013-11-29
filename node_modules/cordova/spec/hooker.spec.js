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
**/

var hooker = require('../src/hooker'),
    util   = require('../src/util'),
    shell  = require('shelljs'),
    child_process = require('child_process'),
    path   = require('path'),
    fs     = require('fs'),
    os     = require('os'),
    Q      = require('q'),
    tempDir= path.join(__dirname, '..', 'temp'),
    hooks  = path.join(__dirname, 'fixtures', 'hooks'),
    cordova= require('../cordova');

var platform = os.platform();
var cwd = process.cwd();

// Note: because there are numerous issues with these tests on windows, the entire spec is skipped if we 
// are in win32 ~jm

if(platform != "win32" ) { 

describe('hooker', function() {
    it('should throw if provided directory is not a cordova project', function() {
        spyOn(util, 'isCordova').andReturn(false);
        expect(function() {
            new hooker(tempDir);
        }).toThrow('Not a Cordova project, can\'t use hooks.');
    });
    it('should not throw if provided directory is a cordova project', function() {
        var root = '/some/root';
        spyOn(util, 'isCordova').andReturn(root);
        expect(function() {
            var h = new hooker(tempDir);
            expect(h.root).toEqual(root);
        }).not.toThrow();
    });

    describe('global (static) fire method', function() {
        it('should execute listeners serially', function(done) {
            var timeout = 20;
            var test_event = 'foo';
            var h1_fired = false;
            var h1 = function() {
                h1_fired = true;
                expect(h2_fired).toBe(false);
                return Q();
            };
            var h2_fired = false;
            var h2 = function() {
                h2_fired = true;
                expect(h1_fired).toBe(true);
                return Q();
            };

            cordova.on(test_event, h1);
            cordova.on(test_event, h2);
            hooker.fire(test_event).then(function() {
                expect(h1_fired).toBe(true);
                expect(h2_fired).toBe(true);
                done();
            });
        });
    });
    describe('project-level fire method', function() {
        var h;
        beforeEach(function() {
            spyOn(util, 'isCordova').andReturn(tempDir);
            h = new hooker(tempDir);
        });

        describe('failure', function() {
            it('should not error if the hook is unrecognized', function() {
                var p;
                runs(function() {
                    p = h.fire('CLEAN YOUR SHORTS GODDAMNIT LIKE A BIG BOY!');
                });
                waitsFor(function() { return !p.isPending() }, 'promise not resolved', 500);
                runs(function() {
                    expect(p.isFulfilled()).toBe(true);
                });
            });
            it('should error if any script exits with non-zero code', function(done) {
                var script = path.join(tempDir, '.cordova', 'hooks', 'before_build');
                shell.mkdir('-p', script);
                this.after(function() { shell.rm('-rf', tempDir); });
                if (platform.match(/(win32|win64)/)) {
                    script = path.join(script, 'fail.bat');
                    shell.cp(path.join(hooks, 'fail', 'fail.bat'), script);
                } else {
                    script = path.join(script, 'fail.sh');
                    shell.cp(path.join(hooks, 'fail', 'fail.sh'), script);
                }
                fs.chmodSync(script, '754');
                h.fire('before_build').then(function() {
                    expect('the call').toBe('a failure');
                }, function(err) {
                    expect(err).toBeDefined();
                }).fin(done);
            });
        });

        describe('success', function() {
            describe('project-level hooks', function() {
                var hook = path.join(tempDir, '.cordova', 'hooks', 'before_build'),
                    s;
                beforeEach(function() {
                    shell.mkdir('-p', hook);
                    if (platform.match(/(win32|win64)/)) {
                        shell.cp(path.join(hooks, 'test', '1.bat'), hook);
                        shell.cp(path.join(hooks, 'test', '07.bat'), hook);
                    } else {
                        shell.cp(path.join(hooks, 'test', '1.sh'), hook);
                        shell.cp(path.join(hooks, 'test', '07.sh'), hook);
                    }
                    fs.readdirSync(hook).forEach(function(script) {
                        fs.chmodSync(path.join(hook, script), '754');
                    });
                    s = spyOn(child_process, 'exec').andCallFake(function(cmd, opts, cb) {
                        if (!cb) cb = opts;
                        cb(0, '', '');
                    });
                });
                afterEach(function() {
                    shell.rm('-rf', tempDir);
                });
                it('should execute all scripts in order and fire callback', function(done) {
                    h.fire('before_build').then(function() {
                        if (platform.match(/(win32|win64)/)) {
                            expect(s.calls[0].args[0]).toMatch(/1.bat/);
                            expect(s.calls[1].args[0]).toMatch(/07.bat/);
                        } else {
                            expect(s.calls[0].args[0]).toMatch(/1.sh/);
                            expect(s.calls[1].args[0]).toMatch(/07.sh/);
                        }
                    }, function(err) {
                        expect(err).not.toBeDefined();
                    }).fin(done);
                });
                it('should pass the project root folder as parameter into the project-level hooks', function(done) {
                    h.fire('before_build').then(function() {
                        var param_str;
                        if (platform.match(/(win32|win64)/)) {
                            param_str = '1.bat "'+tempDir+'"';
                        } else {
                            param_str = '1.sh "'+tempDir+'"';
                        }
                        expect(s.calls[0].args[0].indexOf(param_str)).not.toEqual(-1);
                    }, function(err) {
                        expect(err).toBeUndefined();
                    }).fin(done);
                });
                it('should skip any files starting with a dot on the scripts', function(done) {
                    shell.cp(path.join(hooks, 'test', '07.bat'), path.join(hook, '.swp.file'));
                    h.fire('before_build').then(function() {
                        expect(s).not.toHaveBeenCalledWith(path.join(tempDir, '.cordova', 'hooks', 'before_build', '.swp.file') + ' "' + tempDir + '"', jasmine.any(Object), jasmine.any(Function));
                    }, function(err) {
                        expect(err).not.toBeDefined();
                    }).fin(done);
                });
            });
            describe('module-level hooks', function() {
                var handler = jasmine.createSpy().andReturn(Q());
                var test_event = 'before_build';
                afterEach(function() {
                    cordova.removeAllListeners(test_event);
                    handler.reset();
                });

                it('should fire handlers using cordova.on', function(done) {
                    cordova.on(test_event, handler);
                    h.fire(test_event).then(function() {
                        expect(handler).toHaveBeenCalled();
                    }, function(err) {
                        expect(err).not.toBeDefined();
                    }).fin(done);
                });
                it('should pass the project root folder as parameter into the module-level handlers', function(done) {
                    cordova.on(test_event, handler);
                    h.fire(test_event).then(function() {
                        expect(handler).toHaveBeenCalledWith({root:tempDir});
                    }, function(err) {
                        expect(err).not.toBeDefined();
                    }).fin(done);
                });
                it('should be able to stop listening to events using cordova.off', function(done) {
                    cordova.on(test_event, handler);
                    cordova.off(test_event, handler);
                    h.fire(test_event).then(function() {
                        expect(handler).not.toHaveBeenCalled();
                    }, function(err) {
                        expect(err).toBeUndefined();
                    }).fin(done);
                });
                it('should allow for hook to opt into asynchronous execution and block further hooks from firing using the done callback', function(done) {
                    var h1_fired = false;
                    var h1 = function() {
                        h1_fired = true;
                        expect(h2_fired).toBe(false);
                        return Q();
                    };
                    var h2_fired = false;
                    var h2 = function() {
                        h2_fired = true;
                        expect(h1_fired).toBe(true);
                        return Q();
                    };

                    cordova.on(test_event, h1);
                    cordova.on(test_event, h2);
                    h.fire(test_event).then(function() {
                        expect(h1_fired).toBe(true);
                        expect(h2_fired).toBe(true);
                        done();
                    });
                });
                it('should pass data object that fire calls into async handlers', function(done) {
                    var data = {
                        "hi":"ho",
                        "offtowork":"wego"
                    };
                    var async = function(opts) {
                        data.root = tempDir;
                        expect(opts).toEqual(data);
                        return Q();
                    };
                    cordova.on(test_event, async);
                    h.fire(test_event, data).then(done);
                });
                it('should pass data object that fire calls into sync handlers', function(done) {
                    var data = {
                        "hi":"ho",
                        "offtowork":"wego"
                    };
                    var async = function(opts) {
                        data.root = tempDir;
                        expect(opts).toEqual(data);
                    };
                    cordova.on(test_event, async);
                    h.fire(test_event, data).then(done);
                });
            });
        });
    });
});

}
