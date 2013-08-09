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
    fs                = require('fs'),
    shell             = require('shelljs'),
    hooker            = require('./hooker'),
    platforms         = require('./../platforms'),
    events            = require('./events'),
    n                 = require('ncallbacks');

function shell_out_to_run(projectRoot, platform, options, error_callback, done) {
    var cmd = '"' + path.join(projectRoot, 'platforms', platform, 'cordova', 'run') + '" ' + ( options.length ? options.join(" ") : '--device');
    // TODO: inconsistent API for BB10 run command
/*    if (platform == 'blackberry') {
        var bb_project = path.join(projectRoot, 'platforms', 'blackberry')
        var project = new platforms.blackberry.parser(bb_project);
        if (project.has_device_target()) {
            var bb_config = project.get_cordova_config();
            var device = project.get_device_targets()[0].name;
            cmd = '"' + path.join(bb_project, 'cordova', 'run') + '" --target=' + device + ' -k ' + bb_config.signing_password;
        } else {
            var err = new Error('No BlackBerry device targets defined. If you want to run `run` with BB10, please add a device target. For more information run "' + path.join(bb_project, 'cordova', 'target') + '" -h');
            if (error_callback) error_callback(err);
            else throw err;
        }
    }
*/
    events.emit('log', 'Running app on platform "' + platform + '" with command "' + cmd + '" (output to follow)...');
    shell.exec(cmd, {silent:true, async:true}, function(code, output) {
        events.emit('log', output);
        if (code > 0) {
            var err = new Error('An error occurred while running the ' + platform + ' project. ' + output);
            if (error_callback) error_callback(err);
            else throw err;
        } else {
            events.emit('log', 'Platform "' + platform + '" ran successfully.');
            if (done) done();
        }
    });
}

module.exports = function run(options, callback) {
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
    hooks.fire('before_run', options, function(err) {
        if (err) {
            if (callback) callback(err);
            else throw err;
        } else {
            var end = n(options.platforms.length, function() {
                hooks.fire('after_run', options, function(err) {
                    if (err) {
                        if (callback) callback(err);
                        else throw err;
                    } else {
                        if (callback) callback();
                    }
                });
            });

            // Run a prepare first, then shell out to run
            require('../cordova').prepare(options.platforms, function(err) {
                if (err) {
                    if (callback) callback(err);
                    else throw err;
                } else {
                    options.platforms.forEach(function(platform) {
                        try {
                            shell_out_to_run(projectRoot, platform, options.options, callback, end);
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
