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
var fs = require('fs'),
    path = require('path'),
    shell = require('shelljs'),
    util = require('../util'),
    Q = require('q'),
    child_process = require('child_process'),
    config_parser = require('../config_parser'),
    config = require('../config');

module.exports = function firefoxos_parser(project) {
    this.path = project;
};

// Returns a promise.
module.exports.check_requirements = function(project_root) {
    return Q(); // Requirements always met.
};

module.exports.prototype = {
    // Returns a promise.
    update_from_config: function(config) {
        if (!(config instanceof config_parser)) {
            return Q.reject(new Error('update_from_config requires a config_parser object'));
        }

        var name = config.name();
        var pkg = config.packageName();
        var version = config.version();

        var manifestPath = path.join(this.www_dir(), 'manifest.webapp');
        var manifest;

        if(fs.existsSync(manifestPath)) {
            manifest = JSON.parse(fs.readFileSync(manifestPath));
        }
        else {
            manifest = {
                launch_path: "/index.html",
                installs_allowed_from: ["*"]
            };
        }

        manifest.version = version;
        manifest.name = name;
        manifest.pkgName = pkg;
        fs.writeFileSync(manifestPath, JSON.stringify(manifest));

        return Q();
    },

    www_dir: function() {
        return path.join(this.path, 'www');
    },

    // Used for creating platform_www in projects created by older versions.
    cordovajs_path:function(libDir) {
        var jsPath = path.join(libDir, 'cordova-lib', 'cordova.js');
        return path.resolve(jsPath);
    },

    // Replace the www dir with contents of platform_www and app www.
    update_www:function() {
        var projectRoot = util.isCordova(this.path);
        var app_www = util.projectWww(projectRoot);
        var platform_www = path.join(this.path, 'platform_www');

        // Clear the www dir
        shell.rm('-rf', this.www_dir());
        shell.mkdir(this.www_dir());
        // Copy over all app www assets
        shell.cp('-rf', path.join(app_www, '*'), this.www_dir());
        // Copy over stock platform www assets (cordova.js)
        shell.cp('-rf', path.join(platform_www, '*'), this.www_dir());
    },

    update_overrides: function() {
        var projectRoot = util.isCordova(this.path);
        var mergesPath = path.join(util.appDir(projectRoot), 'merges', 'firefoxos');
        if(fs.existsSync(mergesPath)) {
            var overrides = path.join(mergesPath, '*');
            shell.cp('-rf', overrides, this.www_dir());
        }
    },
    staging_dir: function() {
        return path.join(this.path, '.staging', 'www');
    },
    update_staging: function() {
        var projectRoot = util.isCordova(this.path);
        var stagingDir = path.join(this.path, '.staging', 'www');

        if(fs.existsSync(stagingDir)) {
            shell.cp('-rf',
                     path.join(stagingDir, '*'),
                     this.www_dir());
        }
    },
    config_xml:function(){
        return path.join(this.path, 'www', 'config.xml');
    },

    // Returns a promise.
    update_project: function(cfg) {
        return this.update_from_config(cfg)
        .then(function(){
            this.update_overrides();
            this.update_staging();
            util.deleteSvnFolders(this.www_dir());
        }.bind(this));
    }
};
