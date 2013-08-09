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
    et            = require('elementtree'),
    util          = require('../util'),
    events        = require('../events'),
    shell         = require('shelljs'),
    project_config= require('../config'),
    config_parser = require('../config_parser');

var default_prefs = {
    "useBrowserHistory":"true",
    "exit-on-suspend":"false"
};

module.exports = function android_parser(project) {
    if (!fs.existsSync(path.join(project, 'AndroidManifest.xml'))) {
        throw new Error('The provided path "' + project + '" is not an Android project.');
    }
    this.path = project;
    this.strings = path.join(this.path, 'res', 'values', 'strings.xml');
    this.manifest = path.join(this.path, 'AndroidManifest.xml');
    this.android_config = path.join(this.path, 'res', 'xml', 'config.xml');
};

module.exports.check_requirements = function(project_root, callback) {
    events.emit('log', 'Checking Android requirements...');
    var command = 'android list target';
    events.emit('log', 'Running "' + command + '" (output to follow)');
    shell.exec(command, {silent:true, async:true}, function(code, output) {
        events.emit('log', output);
        if (code != 0) {
            callback('The command `android` failed. Make sure you have the latest Android SDK installed, and the `android` command (inside the tools/ folder) added to your path. Output: ' + output);
        } else {
            if (output.indexOf('android-17') == -1) {
                callback('Please install Android target 17 (the Android 4.2 SDK). Make sure you have the latest Android tools installed as well. Run `android` from your command-line to install/update any missing SDKs or tools.');
            } else {
                var custom_path = project_config.has_custom_path(project_root, 'android');
                var framework_path;
                if (custom_path) {
                    framework_path = path.resolve(path.join(custom_path, 'framework'));
                } else {
                    framework_path = path.join(util.libDirectory, 'android', 'cordova', require('../../platforms').android.version, 'framework');
                }
                var cmd = 'android update project -p "' + framework_path  + '" -t android-17';
                events.emit('log', 'Running "' + cmd + '" (output to follow)...');
                shell.exec(cmd, {silent:true, async:true}, function(code, output) {
                    events.emit('log', output);
                    if (code != 0) {
                        callback('Error updating the Cordova library to work with your Android environment. Command run: "' + cmd + '", output: ' + output);
                    } else {
                        callback(false);
                    }
                });
            }
        }
    });
};

module.exports.prototype = {
    update_from_config:function(config) {
        if (config instanceof config_parser) {
        } else throw new Error('update_from_config requires a config_parser object');

        // Update app name by editing res/values/strings.xml
        var name = config.name();
        var strings = new et.ElementTree(et.XML(fs.readFileSync(this.strings, 'utf-8')));
        strings.find('string[@name="app_name"]').text = name;
        fs.writeFileSync(this.strings, strings.write({indent: 4}), 'utf-8');
        events.emit('log', 'Wrote out Android application name to "' + name + '"');

        var manifest = new et.ElementTree(et.XML(fs.readFileSync(this.manifest, 'utf-8')));
        // Update the version by changing the AndroidManifest android:versionName
        var version = config.version();
        manifest.getroot().attrib["android:versionName"] = version;

        // Update package name by changing the AndroidManifest id and moving the entry class around to the proper package directory
        var pkg = config.packageName();
        pkg = pkg.replace(/-/g, '_'); // Java packages cannot support dashes
        var orig_pkg = manifest.getroot().attrib.package;
        manifest.getroot().attrib.package = pkg;

        // Write out AndroidManifest.xml
        fs.writeFileSync(this.manifest, manifest.write({indent: 4}), 'utf-8');
        
        var orig_pkgDir = path.join(this.path, 'src', path.join.apply(null, orig_pkg.split('.')));
        var orig_java_class = fs.readdirSync(orig_pkgDir).filter(function(f) {return f.indexOf('.svn') == -1;})[0];
        var pkgDir = path.join(this.path, 'src', path.join.apply(null, pkg.split('.')));
        shell.mkdir('-p', pkgDir);
        var orig_javs = path.join(orig_pkgDir, orig_java_class);
        var new_javs = path.join(pkgDir, orig_java_class);
        var javs_contents = fs.readFileSync(orig_javs, 'utf-8');
        javs_contents = javs_contents.replace(/package [\w\.]*;/, 'package ' + pkg + ';');
        events.emit('log', 'Wrote out Android package name to "' + pkg + '"');
        fs.writeFileSync(new_javs, javs_contents, 'utf-8');

        // Update whitelist by changing res/xml/config.xml
        var android_cfg_xml = new util.config_parser(this.android_config);
        // clean out all existing access elements first
        android_cfg_xml.access.remove();
        // add only the ones specified in the app/config.xml file
        config.access.get().forEach(function(uri) {
            android_cfg_xml.access.add(uri);
        });
        
        // Update preferences
        android_cfg_xml.preference.remove();
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
            android_cfg_xml.preference.add({
                name:p,
                value:value
            });
        }
        prefs.forEach(function(pref) {
            android_cfg_xml.preference.add({
                name:pref.name,
                value:pref.value
            });
        });
    },

    // Returns the platform-specific www directory.
    www_dir:function() {
        return path.join(this.path, 'assets', 'www');
    },

    staging_dir: function() {
        return path.join(this.path, '.staging', 'www');
    },

    config_xml:function(){
        return this.android_config;
    },

    update_www:function() {
        var projectRoot = util.isCordova(this.path);
        var www = util.projectWww(projectRoot);
        var platformWww = path.join(this.path, 'assets');
        // remove stock platform assets
        shell.rm('-rf', this.www_dir());
        // copy over all app www assets
        shell.cp('-rf', www, platformWww);

        // write out android lib's cordova.js
        var custom_path = project_config.has_custom_path(projectRoot, 'android');
        var jsPath;
        if (custom_path) {
            jsPath = path.resolve(path.join(custom_path, 'framework', 'assets', 'www', 'cordova.js'));
        } else {
            jsPath = path.join(util.libDirectory, 'android', 'cordova', require('../../platforms').android.version, 'framework', 'assets', 'www', 'cordova.js');
        }
        fs.writeFileSync(path.join(this.www_dir(), 'cordova.js'), fs.readFileSync(jsPath, 'utf-8'), 'utf-8');
    },

    // update the overrides folder into the www folder
    update_overrides:function() {
        var projectRoot = util.isCordova(this.path);
        var merges_path = path.join(util.appDir(projectRoot), 'merges', 'android');
        if (fs.existsSync(merges_path)) {
            var overrides = path.join(merges_path, '*');
            shell.cp('-rf', overrides, this.www_dir());
        }
    },

    // update the overrides folder into the www folder
    update_staging:function() {
        if (fs.existsSync(this.staging_dir())) {
            var staging = path.join(this.staging_dir(), '*');
            shell.cp('-rf', staging, this.www_dir());
        }
    },

    update_project:function(cfg, callback) {
        var platformWww = path.join(this.path, 'assets');
        try {
            this.update_from_config(cfg);
        } catch(e) {
            if (callback) callback(e);
            else throw e;
            return;
        }
        this.update_www();
        this.update_overrides();
        this.update_staging();
        // delete any .svn folders copied over
        util.deleteSvnFolders(platformWww);
        if (callback) callback();
    }
};

