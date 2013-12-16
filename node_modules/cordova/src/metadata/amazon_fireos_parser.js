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
    xml           = require('../xml-helpers'),
    util          = require('../util'),
    events        = require('../events'),
    shell         = require('shelljs'),
    child_process = require('child_process'),
    project_config= require('../config'),
    Q             = require('q'),
    config_parser = require('../config_parser');

var awv_interface='awv_interface.jar';

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

// Returns a promise.
module.exports.check_requirements = function(project_root) {
    events.emit('log', 'Checking Amazon FireOS requirements...');
    var command = 'android list target';
    events.emit('verbose', 'Running "' + command + '" (output to follow)');
    var d = Q.defer();
    child_process.exec(command, function(err, output, stderr) {
        events.emit('verbose', output);
        if (err) {
            d.reject(new Error('The command `android` failed. Make sure you have the latest Android SDK installed, and the `android` command (inside the tools/ folder) added to your path. Output: ' + output));
        } else {
            if (output.indexOf('android-17') == -1) {
                d.reject(new Error('Please install Android target 17 (the Android 4.2 SDK). Make sure you have the latest Android tools installed as well. Run `android` from your command-line to install/update any missing SDKs or tools.'));
            } else {
                var custom_path = project_config.has_custom_path(project_root, 'android');
                var framework_path;
                if (custom_path) {
                    framework_path = path.resolve(path.join(custom_path, 'framework'));
                } else {
                    framework_path = path.join(util.libDirectory, 'amazon-fireos', 'cordova', require('../../platforms').android.version, 'framework');
                }
                var cmd = 'android update project -p "' + framework_path  + '" -t android-17';
                events.emit('verbose', 'Running "' + cmd + '" (output to follow)...');
                var d2 = Q.defer();
                child_process.exec(cmd, function(err, output, stderr) {
                    events.emit('verbose', output + stderr);
                    if (err) {
                        d2.reject(new Error('Updating the Cordova library to work with your Android environment failed when running: "' + cmd + '", output: ' + output));
                    } else {
                        events.emit('log', 'Checking if ' + awv_interface + ' exists... in framework/libs folder');
                        var awv_interface_expected_path=path.join(framework_path,'libs');
                        if (!fs.existsSync(path.join(awv_interface_expected_path,awv_interface))) {
                            d2.reject(new Error('awv_interface.jar not found in ' + awv_interface_expected_path +' folder. \nPlease download the AmazonWebView SDK from http://developer.amazon.com/sdk/fire/IntegratingAWV.html#installawv and copy the awv_interface.jar file to this folder:' + awv_interface_expected_path + ' and re-run cordova platform add amazon-fireos command.'));
                        } else {
                            d2.resolve();
                        }
                    }
                });
                d.resolve(d2.promise);
            }
        }
    });
    return d.promise;
};

module.exports.prototype = {
    update_from_config:function(config) {
        if (config instanceof config_parser) {
        } else throw new Error('update_from_config requires a config_parser object');

        // Update app name by editing res/values/strings.xml
        var name = config.name();
        var strings = xml.parseElementtreeSync(this.strings);
        strings.find('string[@name="app_name"]').text = name;
        fs.writeFileSync(this.strings, strings.write({indent: 4}), 'utf-8');
        events.emit('verbose', 'Wrote out Android application name to "' + name + '"');

        var manifest = xml.parseElementtreeSync(this.manifest);
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
        events.emit('verbose', 'Wrote out Android package name to "' + pkg + '"');
        fs.writeFileSync(new_javs, javs_contents, 'utf-8');
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

     // Used for creating platform_www in projects created by older versions.
    cordovajs_path:function(libDir) {
        var jsPath = path.join(libDir, 'framework', 'assets', 'www', 'cordova.js');
        return path.resolve(jsPath);
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
            jsPath = path.join(util.libDirectory, 'amazon-fireos', 'cordova', require('../../platforms').android.version, 'framework', 'assets', 'www', 'cordova.js');
        }
        fs.writeFileSync(path.join(this.www_dir(), 'cordova.js'), fs.readFileSync(jsPath, 'utf-8'), 'utf-8');
    },

    // update the overrides folder into the www folder
    update_overrides:function() {
        var projectRoot = util.isCordova(this.path);
        var merges_path = path.join(util.appDir(projectRoot), 'merges', 'amazon-fireos');
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

    // Returns a promise.
    update_project:function(cfg) {
        var platformWww = path.join(this.path, 'assets');
        try {
            this.update_from_config(cfg);
        } catch(e) {
            return Q.reject(e);
        }
        this.update_overrides();
        this.update_staging();
        // delete any .svn folders copied over
        util.deleteSvnFolders(platformWww);
        return Q();
    }
};

