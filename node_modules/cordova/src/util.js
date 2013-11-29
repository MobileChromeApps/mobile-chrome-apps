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
var fs            = require('fs'),
    path          = require('path'),
    shell         = require('shelljs');

// Global configuration paths
var HOME = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
var global_config_path = path.join(HOME, '.cordova');
var lib_path = path.join(global_config_path, 'lib');
shell.mkdir('-p', lib_path);

exports = module.exports = {
    globalConfig:global_config_path,
    libDirectory:lib_path,
    // Runs up the directory chain looking for a .cordova directory.
    // IF it is found we are in a Cordova project.
    // If not.. we're not. HOME directory doesnt count.
    // HOMEDRIVE is used to catch when we've backed up to the root drive in windows (i.e C:\)
    isCordova: function isCordova(dir) {
        if (dir && dir != process.env['HOMEDRIVE'] + path.sep) {
            if (dir == HOME) {
                return false;
            } else {
                var contents = fs.readdirSync(dir);
                if (contents && contents.length && (contents.indexOf('.cordova') > -1)) {
                    return dir;
                } else {
                    var parent = path.join(dir, '..');
                    if (parent && parent.length > 1) {
                        return isCordova(parent);
                    } else return false;
                }
            }
        } else return false;
    },
    // Cd to project root dir and return its path. Throw if not in a Corodva project.
    cdProjectRoot: function() {
        var projectRoot = this.isCordova(process.cwd());
        if (!projectRoot) {
            throw new Error('Current working directory is not a Cordova-based project.');
        }
        process.chdir(projectRoot);
        return projectRoot;
    },
    // Recursively deletes .svn folders from a target path
    deleteSvnFolders:function(dir) {
        var contents = fs.readdirSync(dir);
        contents.forEach(function(entry) {
            var fullpath = path.join(dir, entry);
            if (fs.statSync(fullpath).isDirectory()) {
                if (entry == '.svn') {
                    shell.rm('-rf', fullpath);
                } else module.exports.deleteSvnFolders(fullpath);
            }
        });
    },
    listPlatforms:function(project_dir) {
        var core_platforms = require('../platforms');
        return fs.readdirSync(path.join(project_dir, 'platforms')).filter(function(p) {
            return Object.keys(core_platforms).indexOf(p) > -1;
        });
    },
    // list the directories in the path, ignoring any files
    findPlugins:function(pluginPath) {
        var plugins = [],
            stats;

        if (fs.existsSync(pluginPath)) {
            plugins = fs.readdirSync(pluginPath).filter(function (fileName) {
               stats = fs.statSync(path.join(pluginPath, fileName));
               return fileName != '.svn' && fileName != 'CVS' && stats.isDirectory();
            });
        }

        return plugins;
    },
    appDir: function(projectDir) {
        return projectDir;
    },
    projectWww: function(projectDir) {
        return path.join(projectDir, 'www');
    },
    projectConfig: function(projectDir) {
        return path.join(projectDir, 'www', 'config.xml');
    },
    preProcessOptions: function (inputOptions) {
        var DEFAULT_OPTIONS = {
                verbose: false,
                platforms: [],
                options: []
            },
            result = inputOptions || DEFAULT_OPTIONS,
            projectRoot = this.isCordova(process.cwd());

        if (!projectRoot) {
            return new Error('Current working directory is not a Cordova-based project.');
        }
        var projectPlatforms = this.listPlatforms(projectRoot);
        if (projectPlatforms.length === 0) {
            return new Error('No platforms added to this project. Please use `cordova platform add <platform>`.');
        }
        /**
         * Current Desired Arguments
         * options: {verbose: boolean, platforms: [String], options: [String]}
         * Accepted Arguments
         * platformList: [String] -- assume just a list of platforms
         * platform: String -- assume this is a platform
         */
        if (Array.isArray(inputOptions)) {
            result = {
                verbose: false,
                platforms: inputOptions,
                options: []
            };
        } else if (typeof inputOptions === 'string') {
            result = {
                verbose: false,
                platforms: [inputOptions],
                options: []
            };
        }
        if (!result.platforms || (result.platforms && result.platforms.length === 0) ) {
            result.platforms = projectPlatforms;
        }
        return result;
    }
};

// opt_wrap is a boolean: True means that a callback-based wrapper for the promise-based function
// should be created.
function addModuleProperty(module, symbol, modulePath, opt_wrap, opt_obj) {
    var val = null;
    if (opt_wrap) {
        module.exports[symbol] = function() {
            val = val || module.require(modulePath);
            if (arguments.length && typeof arguments[arguments.length - 1] === 'function') {
                // If args exist and the last one is a function, it's the callback.
                var args = Array.prototype.slice.call(arguments);
                var cb = args.pop();
                val.apply(module.exports, args).done(cb, cb);
            } else {
                val.apply(module.exports, arguments).done(null, function(err) { throw err; });
            }
        };
    } else {
        Object.defineProperty(opt_obj || module.exports, symbol, {
            get : function() { return val = val || module.require(modulePath); },
            set : function(v) { val = v; }
        });
    }

    // Add the module.raw.foo as well.
    if(module.exports.raw) {
        Object.defineProperty(module.exports.raw, symbol, {
            get : function() { return val = val || module.require(modulePath); },
            set : function(v) { val = v; }
        });
    }
}

addModuleProperty(module, 'config_parser', './config_parser');
addModuleProperty(module, 'plugin_parser', './plugin_parser');

exports.addModuleProperty = addModuleProperty;
