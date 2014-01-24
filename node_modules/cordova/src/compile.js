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

/*global require: true, module: true, process: true*/
/*jslint sloppy: true, white: true, newcap: true */

var cordova_util      = require('./util'),
    path              = require('path'),
    child_process     = require('child_process'),
    hooker            = require('./hooker'),
    events            = require('./events'),
    Q                 = require('q'),
    os                = require('os');

// Returns a promise.
function shell_out_to_build(projectRoot, platform, options) {
    var cmd = path.join(projectRoot, 'platforms', platform, 'cordova', 'build'),
        args = options.length ? options : [],
        d = Q.defer(),
        errors = "",
        child;

    if (os.platform() === 'win32') {
        args = ['/c',cmd].concat(args);
        cmd = 'cmd';
    }

    events.emit('log', 'Compiling app on platform "' + platform + '" via command "' + cmd + '" ' + args.join(" "));

    //using spawn instead of exec to avoid errors with stdout on maxBuffer
    child = child_process.spawn(cmd, args);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', function (data) {
        events.emit('verbose', data);
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', function (data) {
        events.emit('verbose', data);
        errors = errors + data;
    });

    child.on('close', function (code) {
        events.emit('verbose', "child_process.spawn(" + cmd + "," + "[" + args.join(", ") + "]) = " + code);
        if (code === 0) {
            events.emit('log', 'Platform "' + platform + '" compiled successfully.');
            d.resolve();
        } else {
            d.reject(new Error('An error occurred while building the ' + platform + ' project.' + errors));
        }
    });

    return d.promise;
}

// Returns a promise.
module.exports = function compile(options) {
    var projectRoot = cordova_util.cdProjectRoot(),
        hooks;

    if (!options) {
        options = {
            verbose: false,
            platforms: [],
            options: []
        };
    }

    options = cordova_util.preProcessOptions(options);

    hooks = new hooker(projectRoot);
    return hooks.fire('before_compile', options)
    .then(function() {
        // Iterate over each added platform
        return Q.all(options.platforms.map(function(platform) {
            return shell_out_to_build(projectRoot, platform, options.options);
        }));
    }).then(function() {
        return hooks.fire('after_compile', options);
    });
};
