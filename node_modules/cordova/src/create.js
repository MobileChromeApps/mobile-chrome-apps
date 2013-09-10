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
    shell         = require('shelljs'),
    platforms     = require('../platforms'),
    help          = require('./help'),
    events        = require('./events'),
    config        = require('./config'),
    lazy_load     = require('./lazy_load'),
    util          = require('./util');

var DEFAULT_NAME = "HelloCordova",
    DEFAULT_ID   = "io.cordova.hellocordova";

/**
 * Usage:
 * create(dir) - creates in the specified directory
 * create(dir, name) - as above, but with specified name
 * create(dir, id, name) - you get the gist
 **/
module.exports = function create (dir, id, name, callback) {
    var options = [];

    if (arguments.length === 0) {
        return help();
    }

    // Massage parameters
    var args = Array.prototype.slice.call(arguments, 0);
    if (typeof args[args.length-1] == 'function') {
        callback = args.pop();
    } else if (typeof callback !== 'function') {
        callback = undefined;
    }

    if (args.length === 0) {
        dir = process.cwd();
        id = DEFAULT_ID;
        name = DEFAULT_NAME;
    } else if (args.length == 1) {
        id = DEFAULT_ID;
        name = DEFAULT_NAME;
    } else if (args.length == 2) {
        name = DEFAULT_NAME;
    } else {
        dir = args.shift();
        id = args.shift();
        name = args.shift();
        options = args;
    }

    // Make absolute.
    dir = path.resolve(dir);

    events.emit('log', 'Creating a new cordova project with name "' + name + '" and id "' + id + '" at location "' + dir + '"');

    var dotCordova = path.join(dir, '.cordova');
    var www_dir = path.join(dir, 'www');

    // Create basic project structure.
    shell.mkdir('-p', dotCordova);
    shell.mkdir('-p', path.join(dir, 'platforms'));
    shell.mkdir('-p', path.join(dir, 'merges'));
    shell.mkdir('-p', path.join(dir, 'plugins'));
    shell.mkdir('-p', www_dir);
    var hooks = path.join(dotCordova, 'hooks');
    shell.mkdir('-p', hooks);

    // Add directories for hooks
    shell.mkdir(path.join(hooks, 'after_build'));
    shell.mkdir(path.join(hooks, 'after_compile'));
    shell.mkdir(path.join(hooks, 'after_docs'));
    shell.mkdir(path.join(hooks, 'after_emulate'));
    shell.mkdir(path.join(hooks, 'after_platform_add'));
    shell.mkdir(path.join(hooks, 'after_platform_rm'));
    shell.mkdir(path.join(hooks, 'after_platform_ls'));
    shell.mkdir(path.join(hooks, 'after_plugin_add'));
    shell.mkdir(path.join(hooks, 'after_plugin_ls'));
    shell.mkdir(path.join(hooks, 'after_plugin_rm'));
    shell.mkdir(path.join(hooks, 'after_prepare'));
    shell.mkdir(path.join(hooks, 'after_run'));
    shell.mkdir(path.join(hooks, 'before_build'));
    shell.mkdir(path.join(hooks, 'before_compile'));
    shell.mkdir(path.join(hooks, 'before_docs'));
    shell.mkdir(path.join(hooks, 'before_emulate'));
    shell.mkdir(path.join(hooks, 'before_platform_add'));
    shell.mkdir(path.join(hooks, 'before_platform_rm'));
    shell.mkdir(path.join(hooks, 'before_platform_ls'));
    shell.mkdir(path.join(hooks, 'before_plugin_add'));
    shell.mkdir(path.join(hooks, 'before_plugin_ls'));
    shell.mkdir(path.join(hooks, 'before_plugin_rm'));
    shell.mkdir(path.join(hooks, 'before_prepare'));
    shell.mkdir(path.join(hooks, 'before_run'));

    // Write out .cordova/config.json file with a simple json manifest
    require('../cordova').config(dir, {
        id:id,
        name:name
    });

    var config_json = config.read(dir);

    var finalize = function(www_lib) {
        // Keep going into child "www" folder if exists in stock app package.
        while (fs.existsSync(path.join(www_lib, 'www'))) {
            www_lib = path.join(www_lib, 'www');
        }

        shell.cp('-rf', path.join(www_lib, '*'), www_dir);
        var configPath = util.projectConfig(dir);
        // Add template config.xml for apps that are missing it
        if (!fs.existsSync(configPath)) {
            var template_config_xml = path.join(__dirname, '..', 'templates', 'config.xml');
            shell.cp(template_config_xml, www_dir);
        }
        // Write out id and name to config.xml
        var config = new util.config_parser(configPath);
        config.packageName(id);
        config.name(name);
        if (callback) callback();
    };

    // Check if www assets to use was overridden.
    if (config_json.lib && config_json.lib.www) {
        events.emit('log', 'Using custom www assets ('+config_json.lib.www.id+').');
        lazy_load.custom(config_json.lib.www.uri, config_json.lib.www.id, 'www', config_json.lib.www.version, function(err) {
            if (err) {
                if (callback) callback(err);
                else throw err;
            } else {
                events.emit('log', 'Copying custom www assets into "' + www_dir + '"');
                finalize(path.join(util.libDirectory, 'www', config_json.lib.www.id, config_json.lib.www.version));
            }
        });
    } else {
        // Nope, so use stock cordova-hello-world-app one.
        events.emit('log', 'Using stock cordova hello-world application.');
        lazy_load.cordova('www', function(err) {
            if (err) {
                if (callback) callback(err);
                else throw err;
            } else {
                events.emit('log', 'Copying stock Cordova www assets into "' + www_dir + '"');
                finalize(path.join(util.libDirectory, 'www', 'cordova', platforms.www.version));
            }
        });
    }
};
