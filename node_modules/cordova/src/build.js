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
    Q                 = require('q'),
    hooker            = require('./hooker');

// Returns a promise.
module.exports = function build(options) {
    var projectRoot = cordova_util.cdProjectRoot();

    if (!options) {
        options = {
            verbose: false,
            platforms: [],
            options: []
        };
    }

    options = cordova_util.preProcessOptions(options);

    // fire build hooks
    var hooks = new hooker(projectRoot);
    return hooks.fire('before_build', options)
    .then(function() {
        return require('../cordova').raw.prepare(options);
    }).then(function() {
        return require('../cordova').raw.compile(options);
    }).then(function() {
        return hooks.fire('after_build', options);
    });
};
