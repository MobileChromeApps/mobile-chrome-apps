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
    events            = require('./events'),
    n                 = require('ncallbacks');

module.exports = function build(options, callback) {
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
        if (callback) return callback(options);
        else throw options;
    }

    // fire build hooks
    var hooks = new hooker(projectRoot);
    hooks.fire('before_build', options, function(err) {
        if (err) {
            if (callback) callback(err);
            else throw err;
        } else {
            require('../cordova').prepare(options, function(err) {
                if (err) {
                    if (callback) callback(err);
                    else throw err;
                } else {
                    require('../cordova').compile(options, function(err) {
                        if (err) {
                            if (callback) callback(err);
                            else throw err;
                        } else {
                            hooks.fire('after_build', options, function(err) {
                                if (err) {
                                    if (callback) callback(err);
                                    else throw err;
                                } else {
                                    if (callback) callback();
                                }
                            });
                        }
                    });
                }
            });
        }
    });
};
