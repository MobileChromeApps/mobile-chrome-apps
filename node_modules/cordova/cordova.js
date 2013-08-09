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
var cordova_events = require('./src/events'),
    prepare        = require('./src/prepare'),
    platform       = require('./src/platform'),
    run            = require('./src/run'),
    hooker         = require('./src/hooker'),
    util           = require('./src/util'),
    path           = require('path'),
    fs             = require('fs'),
    compile        = require('./src/compile');

var off = function() {
    cordova_events.removeListener.apply(cordova_events, arguments);
};

var emit = function() {
    cordova_events.emit.apply(cordova_events, arguments);
};

module.exports = {
    help:      require('./src/help'),
    config:    require('./src/config'),
    create:    require('./src/create'),
    platform:  platform,
    platforms: platform,
    prepare:   prepare,
    compile:   compile,
    run:       run,
    ripple:    require('./src/ripple'),
    emulate:   require('./src/emulate'),
    plugin:    require('./src/plugin'),
    plugins:   require('./src/plugin'),
    serve:     require('./src/serve'),
    on:        function() {
        cordova_events.on.apply(cordova_events, arguments);
    },
    off:       off,
    removeListener:off,
    removeAllListeners:function() {
        cordova_events.removeAllListeners.apply(cordova_events, arguments);
    },
    emit:      emit,
    trigger:   emit,
    build:     require('./src/build')
};
