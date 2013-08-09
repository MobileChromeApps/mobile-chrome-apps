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
var cordova_util      = require('./util'),
    path              = require('path'),
    shell             = require('shelljs'),
    platforms         = require('../platforms'),
    platform          = require('./platform'),
    events            = require('./events'),
    fs                = require('fs'),
    n                 = require('ncallbacks'),
    hooker            = require('./hooker'),
    util              = require('util');

function shell_out_to_emulate(root, platform, options, error_callback, done) {
    var cmd = '"' + path.join(root, 'platforms', platform, 'cordova', 'run') + '" ' + (options.length ? options.join(" ") : '--emulator');
    events.emit('log', 'Running on emulator for platform "' + platform + '" via command "' + cmd + '" (output to follow)...');
    shell.exec(cmd, {silent:true, async:true}, function(code, output) {
        events.emit('log', output);
        if (code > 0) {
            var err = new Error('An error occurred while emulating/deploying the ' + platform + ' project.' + output);
            if (error_callback) return error_callback(err);
            else throw err;
        } else {
            events.emit('log', 'Platform "' + platform + '" deployed to emulator.');
            done();
        }
    });
}

module.exports = function emulate (options, callback) {
    var projectRoot = cordova_util.isCordova(process.cwd());

    if (options instanceof Function && callback === undefined) {
        callback = options;
        options = {
            verbose: false,
            platforms: [],
            options: []
        };
    }

    options = cordova_util.preProcessOptions(options);
    if (options.constructor.name === "Error") {
        if (callback) return callback(options)
        else throw options;
    }

    var hooks = new hooker(projectRoot);
    hooks.fire('before_emulate', options, function(err) {
        if (err) {
            if (callback) callback(err);
            else throw err;
        } else {
            var end = n(options.platforms.length, function() {
                hooks.fire('after_emulate', options, function(err) {
                    if (err) {
                        if (callback) callback(err);
                        else throw err;
                    } else {
                        if (callback) callback();
                    }
                });
            });

            // Run a prepare first!
            require('../cordova').prepare(options.platforms, function(err) {
                if (err) {
                    if (callback) callback(err);
                    else throw err;
                } else {
                    options.platforms.forEach(function(platform) {
                        try {
                            shell_out_to_emulate(projectRoot, platform, options.options, callback, end);
                        } catch(e) {
                            if (callback) callback(e);
                            else throw e;
                        }
                    });
                }
            });
        }
    });
};
