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


var cordova = require('../cordova'),
    hooker = require('../src/hooker'),
    shell  = require('shelljs'),
    path   = require('path'),
    fs     = require('fs'),
    os     = require('os'),
    Q      = require('q'),
    child_process = require('child_process'),
    helpers = require('./helpers');

var platform = os.platform();
var tmpDir = helpers.tmpDir('hooks_test');
var project = path.join(tmpDir, 'project');
var dotCordova = path.join(project, '.cordova');
var hooksDir = path.join(project, '.cordova', 'hooks');
var ext = platform.match(/(win32|win64)/)?'bat':'sh';


// copy fixture
shell.rm('-rf', tmpDir);
shell.mkdir('-p', dotCordova);
shell.cp('-R', path.join(__dirname, 'fixtures', 'hooks_' + ext), dotCordova);
shell.mv(path.join(dotCordova, 'hooks_' + ext), hooksDir);
shell.chmod('-R', 'ug+x', hooksDir);


describe('hooker', function() {
    it('should throw if provided directory is not a cordova project', function() {
        expect(function() {
            new hooker(tmpDir);
        }).toThrow('Not a Cordova project, can\'t use hooks.');
    });
});

describe('global (static) fire method', function() {
    it('should execute listeners serially', function(done) {
        var test_event = 'foo';
        var h1_fired = false;
        var h1 = function() {
            expect(h2_fired).toBe(false);
            // Delay 100 ms here to check that h2 is not executed until after
            // the promise returned by h1 is resolved.
            var q = Q.delay(100).then(function() {
                h1_fired = true;
            });
            return q;
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

describe('module-level hooks', function() {
    var handler = jasmine.createSpy().andReturn(Q());
    var test_event = 'before_build';
    var h;

    beforeEach(function() {
        h = new hooker(project);
    });

    afterEach(function() {
        cordova.removeAllListeners(test_event);
        handler.reset();
    });

    it('should fire handlers using cordova.on', function(done) {
        cordova.on(test_event, handler);
        h.fire(test_event)
        .then(function() {
            expect(handler).toHaveBeenCalled();
        })
        .fail(function(err) {
            expect(err).not.toBeDefined();
        })
        .fin(done);
    });

    it('should pass the project root folder as parameter into the module-level handlers', function(done) {
        cordova.on(test_event, handler);
        h.fire(test_event)
        .then(function() {
            expect(handler).toHaveBeenCalledWith({root:project});
        })
        .fail(function(err) {
            console.log(err);
            expect(err).not.toBeDefined();
        })
        .fin(done);
    });

    it('should be able to stop listening to events using cordova.off', function(done) {
        cordova.on(test_event, handler);
        cordova.off(test_event, handler);
        h.fire(test_event)
        .then(function() {
            expect(handler).not.toHaveBeenCalled();
        })
        .fail(function(err) {
            console.log(err);
            expect(err).toBeUndefined();
        })
        .fin(done);
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
            data.root = tmpDir;
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
            data.root = tmpDir;
            expect(opts).toEqual(data);
        };
        cordova.on(test_event, async);
        h.fire(test_event, data).then(done);
    });
});


describe('hooks', function() {
    var h;
    beforeEach(function() {
        h = new hooker(project);
    });


    it('should not error if the hook is unrecognized', function(done) {
        h.fire('CLEAN YOUR SHORTS GODDAMNIT LIKE A BIG BOY!')
        .fail(function (err) {
            expect('Call with unrecogized hook ').toBe('successful.\n' + err);
        })
        .fin(done);
    });

    it('should error if any script exits with non-zero code', function(done) {
        h.fire('fail').then(function() {
            expect('the call').toBe('a failure');
        }, function(err) {
            expect(err).toBeDefined();
        })
        .fin(done);
    });

    it('should execute all scripts in order', function(done) {
        h.fire('test')
        .then(function() {
            var hooksOrderFile = path.join(project, 'hooks_order.txt');
            var hooksEnvFile = path.join(project, 'hooks_env.json');
            var hooksParamsFile = path.join(project, 'hooks_params.txt');
            expect(hooksOrderFile).toExist();
            expect(hooksEnvFile).toExist();
            expect(hooksParamsFile).toExist();
            expect(path.join(project, 'dotted_hook_should_not_fire.txt')).not.toExist();

            var order = fs.readFileSync(hooksOrderFile, 'ascii').replace(/\W/gm, '');
            expect(order).toBe('ab');

            var params = fs.readFileSync(hooksParamsFile, 'ascii').trim().trim('"');
            expect(params).toMatch(project.replace(/\\/g, '\\\\'));

            var env = JSON.parse(fs.readFileSync(hooksEnvFile, 'ascii'));
            expect(env.CORDOVA_VERSION).toEqual(require('../package').version);
        })
        .fail(function(err) {
            console.log(err);
            expect('Test hook call').toBe('successful');
        })
        .fin(done);

    });

    // Cleanup. Must be the last spec. Is there a better place for final cleanup in Jasmine?
    it('should not fail during cleanup', function() {
        process.chdir(path.join(__dirname, '..'));  // Non e2e tests assume CWD is repo root.
        if(ext == 'sh') {
            shell.rm('-rf', tmpDir);
        } else { // Windows:
            // For some mysterious reason, both shell.rm and RMDIR /S /Q won't
            // delete the dir on Windows, but they do remove the files leaving
            // only folders. But the dir is removed just fine by
            // shell.rm('-rf', tmpDir) at the top of this file with the next
            // invocation of this test. The benefit of RMDIR /S /Q is that it
            // doesn't print warnings like shell.rmdir() that look like this:
            // rm: could not remove directory (code ENOTEMPTY): C:\Users\...
            var cmd =  'RMDIR /S /Q ' + tmpDir;
            child_process.exec(cmd);
        }
    });
});
