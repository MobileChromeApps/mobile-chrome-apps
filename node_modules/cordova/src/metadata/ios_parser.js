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
    plist         = require('plist'),
    semver        = require('semver'),
    et            = require('elementtree'),
    config_parser = require('../config_parser'),
    config        = require('../config');

var MIN_XCODE_VERSION = '>=4.5.x';

var default_prefs = {
    "KeyboardDisplayRequiresUserAction":"true",
    "SuppressesIncrementalRendering":"false",
    "UIWebViewBounce":"true",
    "TopActivityIndicator":"gray",
    "EnableLocation":"false",
    "EnableViewportScale":"false",
    "AutoHideSplashScreen":"true",
    "ShowSplashScreenSpinner":"true",
    "MediaPlaybackRequiresUserAction":"false",
    "AllowInlineMediaPlayback":"false",
    "OpenAllWhitelistURLsInWebView":"false",
    "BackupWebStorage":"cloud"
};

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

module.exports.check_requirements = function(project_root, callback) {
    events.emit('log', 'Checking iOS requirements...');
    // Check xcode + version.
    var command = 'xcodebuild -version';
    events.emit('log', 'Running "' + command + '" (output to follow)');
    shell.exec(command, {silent:true, async:true}, function(code, output) {
        events.emit('log', output);
        if (code != 0) {
            callback('Xcode is (probably) not installed, specifically the command `xcodebuild` is unavailable or erroring out. Output of `'+command+'` is: ' + output);
        } else {
            var xc_version = output.split('\n')[0].split(' ')[1];
            if(xc_version.split('.').length === 2){
                xc_version += '.0';
            }
            if (!semver.satisfies(xc_version, MIN_XCODE_VERSION)) {
                callback('Xcode version installed is too old. Minimum: ' + MIN_XCODE_VERSION + ', yours: ' + xc_version);
            } else callback(false);
        }
    });
};

module.exports.prototype = {
    update_from_config:function(config, callback) {
        if (config instanceof config_parser) {
        } else {
            var err = new Error('update_from_config requires a config_parser object');
            if (callback) callback(err);
            else throw err;
            return;
        }
        var name = config.name();
        var pkg = config.packageName();
        var version = config.version();

        // Update package id (bundle id)
        var plistFile = path.join(this.cordovaproj, this.originalName + '-Info.plist');
        var infoPlist = plist.parseFileSync(plistFile);
        infoPlist['CFBundleIdentifier'] = pkg;
        // Update version (bundle version)
        infoPlist['CFBundleVersion'] = version;
        var info_contents = plist.build(infoPlist);
        info_contents = info_contents.replace(/<string>[\s\r\n]*<\/string>/g,'<string></string>');
        fs.writeFileSync(plistFile, info_contents, 'utf-8');
        events.emit('log', 'Wrote out iOS Bundle Identifier to "' + pkg + '"');
        events.emit('log', 'Wrote out iOS Bundle Version to "' + version + '"');

        // Update whitelist
        var self = this;
        this.config.access.remove();
        config.access.get().forEach(function(uri) {
            self.config.access.add(uri);
        });
        
        // Update preferences
        this.config.preference.remove();
        var prefs = config.preference.get();
        // write out defaults, unless user has specifically overrode it
        for (var p in default_prefs) if (default_prefs.hasOwnProperty(p)) {
            var override = prefs.filter(function(pref) { return pref.name == p; });
            var value = default_prefs[p];
            if (override.length) {
                // override exists
                value = override[0].value;
                // remove from prefs list so we dont write it out again below
                prefs = prefs.filter(function(pref) { return pref.name != p });
            }
            this.config.preference.add({
                name:p,
                value:value
            });
        }
        prefs.forEach(function(pref) {
            self.config.preference.add({
                name:pref.name,
                value:pref.value
            });
        });
        
        if (name != this.originalName) {
            // Update product name inside pbxproj file
            var proj = new xcode.project(this.pbxproj);
            var parser = this;
            proj.parse(function(err,hash) {
                if (err) {
                    var err = new Error('An error occured during parsing of project.pbxproj. Start weeping. Output: ' + err);
                    if (callback) callback(err);
                    else throw err;
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
                    events.emit('log', 'Wrote out iOS Product Name and updated XCode project file names from "'+old_name+'" to "' + name + '".');
                    if (callback) callback();
                }
            });
        } else {
            events.emit('log', 'iOS Product Name has not changed (still "' + this.originalName + '")');
            if (callback) callback();
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

    update_www:function() {
        var projectRoot = util.isCordova(this.path);
        var www = util.projectWww(projectRoot);
        var project_www = this.www_dir();

        // remove the stock www folder
        shell.rm('-rf', project_www);

        // copy over project www assets
        shell.cp('-rf', www, this.path);

        // write out proper cordova.js
        var custom_path = config.has_custom_path(projectRoot, 'ios');
        var lib_path = path.join(util.libDirectory, 'ios', 'cordova', require('../../platforms').ios.version);
        if (custom_path) lib_path = custom_path;
        shell.cp('-f', path.join(lib_path, 'CordovaLib', 'cordova.js'), path.join(project_www, 'cordova.js'));

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

    update_project:function(cfg, callback) {
        var self = this;
        this.update_from_config(cfg, function(err) {
            if (err) {
                if (callback) callback(err);
                else throw err;
            } else {
                self.update_www();
                self.update_overrides();
                self.update_staging();
                util.deleteSvnFolders(self.www_dir());
                if (callback) callback();
            }
        });
    }
};
