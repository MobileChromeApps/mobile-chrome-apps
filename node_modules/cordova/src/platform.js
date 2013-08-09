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
var config            = require('./config'),
    cordova_util      = require('./util'),
    util              = require('util'),
    fs                = require('fs'),
    path              = require('path'),
    hooker            = require('./hooker'),
    events            = require('./events'),
    lazy_load         = require('./lazy_load'),
    n                 = require('ncallbacks'),
    platforms         = require('../platforms'),
    plugman           = require('plugman'),
    shell             = require('shelljs');

module.exports = function platform(command, targets, callback) {
    var projectRoot = cordova_util.isCordova(process.cwd());

    if (!projectRoot) {
        var err = new Error('Current working directory is not a Cordova-based project.');
        if (callback) callback(err);
        else throw err;
        return;
    }

    var hooks = new hooker(projectRoot);


    if (arguments.length === 0) command = 'ls';
    if (targets) {
        if (!(targets instanceof Array)) targets = [targets];
        targets.forEach(function(t) {
            if (!(t in platforms)) {
                var err = new Error('Platform "' + t + '" not recognized as core cordova platform.');
                if (callback) return callback(err);
                else throw err;
            }
        });
    } else {
        if (command == 'add' || command == 'rm') {
            var err = new Error('You need to qualify `add` or `remove` with one or more platforms!');
            if (callback) return callback(err);
            else throw err;
        }
    }

    var xml = cordova_util.projectConfig(projectRoot);
    var cfg = new cordova_util.config_parser(xml);
    var opts = {
        platforms:targets
    };

    switch(command) {
        case 'add':
            var end = n(targets.length, function() {
                hooks.fire('after_platform_add', opts, function(err) {
                    if (err) {
                        if (callback) callback(err);
                        else throw err;
                    } else {
                        if (callback) callback();
                    }
                });
            });
            hooks.fire('before_platform_add', opts, function(err) {
                if (err) {
                    if (callback) callback(err);
                    else throw err;
                } else {
                    var config_json = config.read(projectRoot);
                    targets.forEach(function(t) {
                        lazy_load.based_on_config(projectRoot, t, function(err) {
                            if (err) {
                                if (callback) callback(err);
                                else throw err;
                            } else {
                                if (config_json.lib && config_json.lib[t]) {
                                    call_into_create(t, projectRoot, cfg, config_json.lib[t].id, config_json.lib[t].version, callback, end);
                                } else {
                                    call_into_create(t, projectRoot, cfg, 'cordova', platforms[t].version, callback, end);
                                }
                            }
                        });
                    });
                }
            });
            break;
        case 'rm':
        case 'remove':
            var end = n(targets.length, function() {
                hooks.fire('after_platform_rm', opts, function(err) {
                    if (err) {
                        if (callback) callback(err);
                        else throw err;
                    } else {
                        if (callback) callback();
                    }
                });
            });
            hooks.fire('before_platform_rm', opts, function(err) {
                if (err) {
                    if (callback) callback(err);
                    else throw err;
                } else {
                    targets.forEach(function(target) {
                        shell.rm('-rf', path.join(projectRoot, 'platforms', target));
                        shell.rm('-rf', path.join(cordova_util.appDir(projectRoot), 'merges', target));
                        var plugins_json = path.join(projectRoot, 'plugins', target + '.json');
                        if (fs.existsSync(plugins_json)) shell.rm(plugins_json);
                        end();
                    });
                }
            });
            break;
        case 'ls':
        case 'list':
        default:
            var platforms_on_fs = cordova_util.listPlatforms(projectRoot);
            hooks.fire('before_platform_ls', function(err) {
                if (err) {
                    if (callback) callback(err);
                    else throw err;
                } else {
                    events.emit('results', (platforms_on_fs.length ? platforms_on_fs : 'No platforms added. Use `cordova platform add <platform>`.'));
                    hooks.fire('after_platform_ls', function(err) {
                        if (err) {
                            if (callback) callback(err);
                            else throw err;
                        }
                    });
                }
            });
            break;
    }
};

/**
 * Check Platform Support.
 *
 * Options:
 *
 *   - {String} `name` of the platform to test.
 *   - {Function} `callback` is triggered with the answer.
 *     - {Error} `e` null when a platform is supported otherwise describes error.
 */

module.exports.supports = function(project_root, name, callback) {
    // required parameters
    if (!name) throw new Error('requires a platform name parameter');
    if (!callback) throw new Error('requires a callback parameter');

    // check if platform exists
    var platform = platforms[name];
    if (!platform) {
        callback(new Error(util.format('"%s" platform does not exist', name)));
        return;
    }

    // look up platform meta-data parser
    var platformParser = platforms[name].parser;
    if (!platformParser) {
        callback(new Error(util.format('"%s" platform parser does not exist', name)));
        return;
    }

    // check for platform support
    platformParser.check_requirements(project_root, function(e) {
        // typecast String to Error
        e = (typeof e == 'string') ? new Error(e) : e;
        // typecast false Boolean to null
        e = (e) ? e : null;

        callback(e);
    });
};

// Expose the platform parsers on top of this command
for (var p in platforms) {
    module.exports[p] = platforms[p];
}
function createOverrides(projectRoot, target) {
    shell.mkdir('-p', path.join(cordova_util.appDir(projectRoot), 'merges', target));
};

function call_into_create(target, projectRoot, cfg, id, version, callback, end) {
    var output = path.join(projectRoot, 'platforms', target);

    // Check if output directory already exists.
    if (fs.existsSync(output)) {
        var err = new Error('Platform "' + target + '" already exists at "' + output + '"');
        if (callback) callback(err);
        else throw err;
    } else {
        // Make sure we have minimum requirements to work with specified platform
        events.emit('log', 'Checking if platform "' + target + '" passes minimum requirements...');
        module.exports.supports(projectRoot, target, function(err) {
            if (err) {
                if (callback) callback(err);
                else throw err;
            } else {
                // Create a platform app using the ./bin/create scripts that exist in each repo.
                // Run platform's create script
                var bin = path.join(cordova_util.libDirectory, target, id, version, 'bin', 'create');
                if(target == 'wp7') bin = path.join(cordova_util.libDirectory, 'wp', id, version, 'wp7', 'bin', 'create');
                if(target == 'wp8') bin = path.join(cordova_util.libDirectory, 'wp', id, version, 'wp8', 'bin', 'create');
                var args = (target=='ios') ? '--arc' : '';
                var pkg = cfg.packageName().replace(/[^\w.]/g,'_');
                var name = cfg.name();
                var command = util.format('"%s" %s "%s" "%s" "%s"', bin, args, output, pkg, name);
                events.emit('log', 'Running bin/create for platform "' + target + '" with command: "' + command + '" (output to follow)');

                shell.exec(command, {silent:true,async:true}, function(code, create_output) {
                    events.emit('log', create_output);
                    if (code > 0) {
                        var err = new Error('An error occured during creation of ' + target + ' sub-project. ' + create_output);
                        if (callback) callback(err);
                        else throw err;
                    } else {
                        require('../cordova').prepare(target, function(err) {
                            if (err) {
                                if (callback) callback(err);
                                else throw err;
                            } else {
                                createOverrides(projectRoot, target);
                                end(); //platform add is done by now.
                                // Install all currently installed plugins into this new platform.
                                var plugins_dir = path.join(projectRoot, 'plugins');
                                var plugins = cordova_util.findPlugins(plugins_dir);
                                var parser = new platforms[target].parser(output);
                                plugins && plugins.forEach(function(plugin) {
                                    events.emit('log', 'Installing plugin "' + plugin + '" following successful platform add of ' + target);
                                    plugman.install(target, output, path.basename(plugin), plugins_dir, { www_dir: parser.staging_dir() });
                                });
                            }
                        });
                    }
                });
            }
        });
    }
}
