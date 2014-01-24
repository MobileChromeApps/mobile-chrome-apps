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
    CordovaError  = require('./CordovaError'),
    shell         = require('shelljs');

// Global configuration paths
var HOME = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
var global_config_path = path.join(HOME, '.cordova');
var lib_path = path.join(global_config_path, 'lib');
shell.mkdir('-p', lib_path);

function isRootDir(dir) {
    if (fs.existsSync(path.join(dir, 'www'))) {
        // For sure is.
        if (fs.existsSync(path.join(dir, 'config.xml'))) {
            return 2;
        }
        // Might be (or may be under platforms/).
        if (fs.existsSync(path.join(dir, 'www', 'config.xml'))) {
            return 1;
        }
    }
    return 0;
}

exports = module.exports = {
    globalConfig:global_config_path,
    libDirectory:lib_path,
    // Runs up the directory chain looking for a .cordova directory.
    // IF it is found we are in a Cordova project.
    // Omit argument to use CWD.
    isCordova: function isCordova(dir) {
        if (!dir) {
            // Prefer PWD over cwd so that symlinked dirs within your PWD work correctly (CB-5687).
            var pwd = process.env.PWD;
            var cwd = process.cwd();
            if (pwd && pwd != cwd) {
                return this.isCordova(pwd) || this.isCordova(cwd);
            }
            return this.isCordova(cwd);
        }
        var bestReturnValueSoFar = false;
        for (var i = 0; i < 1000; ++i) {
            var result = isRootDir(dir);
            if (result === 2) {
                return dir;
            }
            if (result === 1) {
                bestReturnValueSoFar = dir;
            }
            var parentDir = path.normalize(path.join(dir, '..'));
            // Detect fs root.
            if (parentDir == dir) {
                return bestReturnValueSoFar;
            }
            dir = parentDir;
        }
        console.error('Hit an unhandled case in util.isCordova');
        return false;
    },
    // Cd to project root dir and return its path. Throw CordovaError if not in a Corodva project.
    cdProjectRoot: function() {
        var projectRoot = this.isCordova();
        if (!projectRoot) {
            throw new CordovaError('Current working directory is not a Cordova-based project.');
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
        var rootPath = path.join(projectDir, 'config.xml');
        var wwwPath = path.join(projectDir, 'www', 'config.xml');
        if (fs.existsSync(rootPath)) {
            return rootPath;
        } else if (fs.existsSync(wwwPath)) {
            return wwwPath;
        }
        return rootPath;
    },
    preProcessOptions: function (inputOptions) {
        var DEFAULT_OPTIONS = {
                verbose: false,
                platforms: [],
                options: []
            },
            result = inputOptions || DEFAULT_OPTIONS,
            projectRoot = this.isCordova();

        if (!projectRoot) {
            throw new CordovaError('Current working directory is not a Cordova-based project.');
        }
        var projectPlatforms = this.listPlatforms(projectRoot);
        if (projectPlatforms.length === 0) {
            throw new CordovaError('No platforms added to this project. Please use `cordova platform add <platform>`.');
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
