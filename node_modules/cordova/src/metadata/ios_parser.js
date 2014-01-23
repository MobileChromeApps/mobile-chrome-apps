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
    xcode         = require('xcode'),
    util          = require('../util'),
    events        = require('../events'),
    shell         = require('shelljs'),
    plist         = require('plist-with-patches'),
    Q             = require('q'),
    config_parser = require('../config_parser'),
    config        = require('../config');

module.exports = function ios_parser(project) {
    try {
        var xcodeproj_dir = fs.readdirSync(project).filter(function(e) { return e.match(/\.xcodeproj$/i); })[0];
        if (!xcodeproj_dir) throw new Error('The provided path "' + project + '" is not a Cordova iOS project.');
        this.xcodeproj = path.join(project, xcodeproj_dir);
        this.originalName = this.xcodeproj.substring(this.xcodeproj.lastIndexOf(path.sep)+1, this.xcodeproj.indexOf('.xcodeproj'));
        this.cordovaproj = path.join(project, this.originalName);
    } catch(e) {
        throw new Error('The provided path is not a Cordova iOS project.');
    }
    this.path = project;
    this.pbxproj = path.join(this.xcodeproj, 'project.pbxproj');
    this.config_path = path.join(this.cordovaproj, 'config.xml');
    this.config = new util.config_parser(this.config_path);
};

// Returns a promise.
module.exports.check_requirements = function(project_root) {
    // Rely on platform's bin/create script to check requirements.
    return Q(true);
};

module.exports.prototype = {
    // Returns a promise.
    update_from_config:function(config) {
        if (config instanceof config_parser) {
        } else {
            return Q.reject(new Error('update_from_config requires a config_parser object'));
        }
        var name = config.name();
        var pkg = config.packageName();
        var version = config.version();

        // Update package id (bundle id)
        var plistFile = path.join(this.cordovaproj, this.originalName + '-Info.plist');
        var infoPlist = plist.parseFileSync(plistFile);
        infoPlist['CFBundleIdentifier'] = pkg;

        // Update version (bundle version)
        infoPlist['CFBundleShortVersionString'] = version;
        // TODO: add a way to update infoPlist['CFBundleVersion'].

        var info_contents = plist.build(infoPlist);
        info_contents = info_contents.replace(/<string>[\s\r\n]*<\/string>/g,'<string></string>');
        fs.writeFileSync(plistFile, info_contents, 'utf-8');
        events.emit('verbose', 'Wrote out iOS Bundle Identifier to "' + pkg + '"');
        events.emit('verbose', 'Wrote out iOS Bundle Version to "' + version + '"');

        if (name != this.originalName) {
            // Update product name inside pbxproj file
            var proj = new xcode.project(this.pbxproj);
            var parser = this;
            var d = Q.defer();
            proj.parse(function(err,hash) {
                if (err) {
                    d.reject(new Error('An error occured during parsing of project.pbxproj. Start weeping. Output: ' + err));
                } else {
                    proj.updateProductName(name);
                    fs.writeFileSync(parser.pbxproj, proj.writeSync(), 'utf-8');
                    // Move the xcodeproj and other name-based dirs over.
                    shell.mv(path.join(parser.cordovaproj, parser.originalName + '-Info.plist'), path.join(parser.cordovaproj, name + '-Info.plist'));
                    shell.mv(path.join(parser.cordovaproj, parser.originalName + '-Prefix.pch'), path.join(parser.cordovaproj, name + '-Prefix.pch'));
                    shell.mv(parser.xcodeproj, path.join(parser.path, name + '.xcodeproj'));
                    shell.mv(parser.cordovaproj, path.join(parser.path, name));
                    // Update self object with new paths
                    var old_name = parser.originalName;
                    parser = new module.exports(parser.path);
                    // Hack this shi*t
                    var pbx_contents = fs.readFileSync(parser.pbxproj, 'utf-8');
                    pbx_contents = pbx_contents.split(old_name).join(name);
                    fs.writeFileSync(parser.pbxproj, pbx_contents, 'utf-8');
                    events.emit('verbose', 'Wrote out iOS Product Name and updated XCode project file names from "'+old_name+'" to "' + name + '".');
                    d.resolve();
                }
            });
            return d.promise;
        } else {
            events.emit('verbose', 'iOS Product Name has not changed (still "' + this.originalName + '")');
            return Q();
        }
    },

    // Returns the platform-specific www directory.
    www_dir:function() {
        return path.join(this.path, 'www');
    },

    staging_dir: function() {
        return path.join(this.path, '.staging', 'www');
    },

    config_xml:function(){
        return this.config_path;
    },

    // Used for creating platform_www in projects created by older versions.
    cordovajs_path:function(libDir) {
        var jsPath = path.join(libDir, 'CordovaLib', 'cordova.js');
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

    // update the overrides folder into the www folder
    update_overrides:function() {
        var projectRoot = util.isCordova(this.path);
        var merges_path = path.join(util.appDir(projectRoot), 'merges', 'ios');
        if (fs.existsSync(merges_path)) {
            var overrides = path.join(merges_path, '*');
            shell.cp('-rf', overrides, this.www_dir());
        }
    },

    // update the overrides folder into the www folder
    update_staging:function() {
        var projectRoot = util.isCordova(this.path);
        if (fs.existsSync(this.staging_dir())) {
            var staging = path.join(this.staging_dir(), '*');
            shell.cp('-rf', staging, this.www_dir());
        }
    },

    // Returns a promise.
    update_project:function(cfg) {
        var self = this;
        return this.update_from_config(cfg)
        .then(function() {
            self.update_overrides();
            self.update_staging();
            util.deleteSvnFolders(self.www_dir());
        });
    }
};
