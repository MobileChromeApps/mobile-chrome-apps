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
var shell = require('shelljs'),
    util  = require('./util'),
    fs    = require('fs'),
    events= require('./events'),
    path  = require('path');

module.exports = function hooker(root) {
    var r = util.isCordova(root);
    if (!r) throw new Error('Not a Cordova project, can\'t use hooks.');
    else this.root = r;
}

module.exports.fire = function global_fire(hook, opts, callback) {
    if (arguments.length == 2 && typeof opts == 'function') {
        callback = opts;
        opts = {};
    }
    var handlers = events.listeners(hook);
    execute_handlers_serially(handlers, opts, function() {
        if (callback) callback();
    });
};

module.exports.prototype = {
    fire:function fire(hook, opts, callback) {
        if (arguments.length == 2) {
            callback = opts;
            opts = {};
        }
        var self = this;
        var dir = path.join(this.root, '.cordova', 'hooks', hook);
        opts.root = this.root;

        // Fire JS hook for the event
        // These ones need to "serialize" events, that is, each handler attached to the event needs to finish processing (if it "opted in" to the callback) before the next one will fire.
        var handlers = events.listeners(hook);
        execute_handlers_serially(handlers, opts, function() {
            // Fire script-based hooks
            if (!(fs.existsSync(dir))) {
                callback(); // hooks directory got axed post-create; ignore.
            } else {
                var scripts = fs.readdirSync(dir).filter(function(s) {
                    return s[0] != '.';
                });
                execute_scripts_serially(scripts, self.root, dir, function(err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback();
                    }
                });
            }
        });
    }
}

function execute_scripts_serially(scripts, root, dir, callback) {
    if (scripts.length) {
        var s = scripts.shift();
        var fullpath = path.join(dir, s);
        if (fs.statSync(fullpath).isDirectory()) {
            execute_scripts_serially(scripts, root, dir, callback); // skip directories if they're in there.
        } else {
            var command = fullpath + ' "' + root + '"';
            events.emit('log', 'Executing hook "' + command + '" (output to follow)...');
            shell.exec(command, {silent:true, async:true}, function(code, output) {
                events.emit('log', output);
                if (code !== 0) {
                    callback(new Error('Script "' + fullpath + '" exited with non-zero status code. Aborting. Output: ' + output));
                } else {
                    execute_scripts_serially(scripts, root, dir, callback);
                }
            });
        }
    } else {
        callback();
    }
}

function execute_handlers_serially(handlers, opts, callback) {
    if (handlers.length) {
        var h = handlers.shift();
        if (h.length > 1) {
            h(opts, function() {
                execute_handlers_serially(handlers, opts, callback);
            });
        } else {
            h(opts);
            execute_handlers_serially(handlers, opts, callback);
        }
    } else {
        callback();
    }
}
