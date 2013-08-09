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

var path          = require('path'),
    fs            = require('fs'),
    url           = require('url'),
    shell         = require('shelljs'),
    events        = require('./events'),
    util          = require('./util');

module.exports = function config(project_root, opts) {
    var json = module.exports.read(project_root);
    Object.keys(opts).forEach(function(p) {
        json[p] = opts[p];
    });
    return module.exports.write(project_root, json);
};

module.exports.read = function get_config(project_root) {
    var dotCordova = path.join(project_root, '.cordova');

    if (!fs.existsSync(dotCordova)) {
        shell.mkdir('-p', dotCordova);
    }

    var config_json = path.join(dotCordova, 'config.json');
    if (!fs.existsSync(config_json)) {
        return module.exports.write(project_root, {});
    } else {
        return JSON.parse(fs.readFileSync(config_json, 'utf-8'));
    }
};

module.exports.write = function set_config(project_root, json) {
    var dotCordova = path.join(project_root, '.cordova');
    var config_json = path.join(dotCordova, 'config.json');
    fs.writeFileSync(config_json, JSON.stringify(json), 'utf-8');
    return json;
};

module.exports.has_custom_path = function(project_root, platform) {
    var json = module.exports.read(project_root);
    if (json.lib && json.lib[platform]) {
        var uri = url.parse(json.lib[platform].uri);
        if (!(uri.protocol)) return uri.path;
        else if (uri.protocol && uri.protocol[1] ==':') return uri.href;
    }
    return false;
};
