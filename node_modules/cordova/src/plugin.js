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
var cordova_util  = require('./util'),
    util          = require('util'),
    fs            = require('fs'),
    path          = require('path'),
    shell         = require('shelljs'),
    platforms     = require('../platforms'),
    n             = require('ncallbacks'),
    hooker        = require('./hooker'),
    plugman       = require('plugman'),
    events        = require('./events');

module.exports = function plugin(command, targets, callback) {
    var projectRoot = cordova_util.isCordova(process.cwd()),
        err;

    if (!projectRoot) {
        err = new Error('Current working directory is not a Cordova-based project.');
        if (callback) callback(err);
        else throw err;
        return;
    }

    if (arguments.length === 0){
        command = 'ls';
        targets = [];
    } else if (arguments.length > 3) {
        var args = Array.prototype.slice.call(arguments, 0);
        if (typeof args[args.length - 1] === "function") {
            callback = args.pop();
        } else {
            callback = undefined;
            targets = args.slice(1);
        }
    }

    var hooks = new hooker(projectRoot);
    var platformList = cordova_util.listPlatforms(projectRoot);

    // Massage plugin name(s) / path(s)
    var pluginPath, plugins;
    pluginPath = path.join(projectRoot, 'plugins');
    plugins = cordova_util.findPlugins(pluginPath);
    if (targets) {
        if (!(targets instanceof Array)) {
            targets = [targets];
        }
    } else {
        if (command == 'add' || command == 'rm') {
            err = new Error('You need to qualify `add` or `remove` with one or more plugins!');
            if (callback) return callback(err);
            else throw err;
        } else {
            targets = [];
        }
    }

    var opts = {
        plugins: [],
        options: []
    };

    //Split targets between plugins and options
    //Assume everything after a token with a '-' is an option
    var i;
    for (i = 0; i < targets.length; i++) {
        if (targets[i].match(/^-/)) {
            opts.options = targets.slice(i);
            break;
        } else {
            opts.plugins.push(targets[i]);
        }
    }

    switch(command) {
        case 'add':
            var end = n(opts.plugins.length, function() {
                hooks.fire('after_plugin_add', opts, function(err) {
                    if (err) {
                        if (callback) callback(err);
                        else throw err;
                    } else {
                        if (callback) callback();
                    }
                });
            });
            hooks.fire('before_plugin_add', opts, function(err) {
                if (err) {
                    if (callback) callback(err);
                    else throw err;
                } else {
                    opts.plugins.forEach(function(target, index) {
                        var pluginsDir = path.join(projectRoot, 'plugins');

                        if (target[target.length - 1] == path.sep) {
                            target = target.substring(0, target.length - 1);
                        }

                        // Fetch the plugin first.
                        events.emit('log', 'Calling plugman.fetch on plugin "' + target + '"');
                        plugman.fetch(target, pluginsDir, {}, function(err, dir) {
                            if (err) {
                                err = new Error('Error fetching plugin: ' + err);
                                if (callback) callback(err);
                                else throw err;
                            } else {
                                // Iterate over all platforms in the project and install the plugin.
                                platformList.forEach(function(platform) {
                                    var platformRoot = path.join(projectRoot, 'platforms', platform),
                                        parser = new platforms[platform].parser(platformRoot),
                                        options = {
                                            www_dir: parser.staging_dir(),
                                            cli_variables: {}
                                        },
                                        tokens,
                                        key,
                                        i;
                                    //parse variables into cli_variables
                                    for (i=0; i< opts.options.length; i++) {
                                        if (opts.options[i] === "--variable" && typeof opts.options[++i] === "string") {
                                            tokens = opts.options[i].split('=');
                                            key = tokens.shift().toUpperCase();
                                            if (/^[\w-_]+$/.test(key)) {
                                                options.cli_variables[key] = tokens.join('=');
                                            }
                                        }
                                    }

                                    events.emit('log', 'Calling plugman.install on plugin "' + dir + '" for platform "' + platform + '" with options "' + JSON.stringify(options)  + '"');
                                    plugman.install(platform, platformRoot, path.basename(dir), pluginsDir, options);
                                });
                                end();
                            }
                        });
                    });
                }
            });
            break;
        case 'rm':
        case 'remove':
            var end = n(opts.plugins.length, function() {
                hooks.fire('after_plugin_rm', opts, function(err) {
                    if (err) {
                        if (callback) callback(err);
                        else throw err;
                    } else {
                        if (callback) callback();
                    }
                });
            });
            hooks.fire('before_plugin_rm', opts, function(err) {
                if (err) {
                    if (callback) callback(err);
                    else throw err;
                } else {
                    opts.plugins.forEach(function(target, index) {
                        // Check if we have the plugin.
                        if (plugins.indexOf(target) > -1) {
                            var targetPath = path.join(pluginPath, target);
                            // Check if there is at least one match between plugin
                            // supported platforms and app platforms
                            var pluginXml = new cordova_util.plugin_parser(path.join(targetPath, 'plugin.xml'));
                            var intersection = pluginXml.platforms.filter(function(e) {
                                if (platformList.indexOf(e) == -1) return false;
                                else return true;
                            });

                            // Iterate over all installed platforms and uninstall.
                            // If this is a web-only or dependency-only plugin, then
                            // there may be nothing to do here except remove the
                            // reference from the platform's plugin config JSON.
                            platformList.forEach(function(platform) {
                                var platformRoot = path.join(projectRoot, 'platforms', platform);
                                var parser = new platforms[platform].parser(platformRoot);
                                events.emit('log', 'Calling plugman.uninstall on plugin "' + target + '" for platform "' + platform + '"');
                                plugman.uninstall.uninstallPlatform(platform, platformRoot, target, path.join(projectRoot, 'plugins'), { www_dir: parser.staging_dir() });
                            });
                            plugman.uninstall.uninstallPlugin(target, path.join(projectRoot, 'plugins'), end);
                        } else {
                            var err = new Error('Plugin "' + target + '" not added to project.');
                            if (callback) callback(err);
                            else throw err;
                            return;
                        }
                    });
                }
            });
            break;
        case 'search':
            hooks.fire('before_plugin_search', function(err) {
                if (err) {
                    if(callback) callback(err);
                    else throw err;
                } else {
                    plugman.search(opts.plugins, function(err, plugins) {
                        if(err) return console.log(err);
                        for(var plugin in plugins) {
                            console.log();
                            events.emit('results', plugins[plugin].name, '-', plugins[plugin].description || 'no description provided');
                        }
                        hooks.fire('after_plugin_search', function(err) {
                            if(err) {
                                if(callback) callback(err);
                                else throw err;
                            }
                        });
                    });

                }

            });
            break;
        case 'ls':
        case 'list':
        default:
            hooks.fire('before_plugin_ls', function(err) {
                if (err) {
                    if (callback) callback(err);
                    else throw err;
                } else {
                    events.emit('results', (plugins.length ? plugins : 'No plugins added. Use `cordova plugin add <plugin>`.'));
                    hooks.fire('after_plugin_ls', function(err) {
                        if (err) {
                            if (callback) callback(err);
                            else throw err;
                        } else {
                            if (callback) callback(undefined, plugins);
                        }
                    });
                }
            });
            break;
    }
};
