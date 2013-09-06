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
    shell         = require('shelljs'),
    util          = require('../util'),
    config_parser = require('../config_parser'),
    events        = require('../events'),
    config        = require('../config');

module.exports = function blackberry_parser(project) {
    if (!fs.existsSync(path.join(project, 'www'))) {
        throw new Error('The provided path "' + project + '" is not a Cordova BlackBerry10 project.');
    }
    this.path = project;
    this.config_path = path.join(this.path, 'www', 'config.xml');
    this.xml = new util.config_parser(this.config_path);
};

module.exports.check_requirements = function(project_root, callback) {
    var lib_path = path.join(util.libDirectory, 'blackberry10', 'cordova', require('../../platforms').blackberry10.version);
    shell.exec("\"" + path.join(lib_path, 'bin', 'check_reqs') + "\"", {silent:true, async:true}, function(code, output) {
        if (code !== 0) {
            callback(output);
        } else {
            callback(false);
        }
    });
};

module.exports.prototype = {
    update_from_config:function(config) {
        var self = this;

        if (config instanceof config_parser) {
        } else throw new Error('update_from_config requires a config_parser object');

        this.xml.name(config.name());
        events.emit('log', 'Wrote out BlackBerry application name to "' + config.name() + '"');
        this.xml.packageName(config.packageName());
        events.emit('log', 'Wrote out BlackBerry package name to "' + config.packageName() + '"');
        this.xml.version(config.version());
        events.emit('log', 'Wrote out BlackBerry version to "' + config.version() + '"');
        this.xml.access.remove();
        config.access.getAttributes().forEach(function(attribs) {
            self.xml.access.add(attribs.uri || attribs.origin, attribs.subdomains);
        });
        this.xml.preference.remove();
        config.preference.get().forEach(function (pref) {
            self.xml.preference.add(pref);
        });
        this.xml.content(config.content());
    },
    update_project:function(cfg, callback) {
        var self = this;

        try {
            self.update_from_config(cfg);
        } catch(e) {
            if (callback) return callback(e);
            else throw e;
        }
        self.update_www();
        self.update_overrides();
        self.update_staging();
        util.deleteSvnFolders(this.www_dir());
        if (callback) callback();
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
        var platformWww = this.www_dir();

        // remove the stock www folder
        shell.rm('-rf', this.www_dir());
        // copy over project www assets
        shell.cp('-rf', www, this.path);
        //Re-Write config.xml
        this.xml.update();

        var custom_path = config.has_custom_path(projectRoot, 'blackberry10');
        var lib_path = path.join(util.libDirectory, 'blackberry10', 'cordova', require('../../platforms').blackberry10.version);
        if (custom_path) lib_path = custom_path;
        // add cordova.js
        shell.cp('-f', path.join(lib_path, 'javascript', 'cordova.blackberry10.js'), path.join(this.www_dir(), 'cordova.js'));
    },

    // update the overrides folder into the www folder
    update_overrides:function() {
        var projectRoot = util.isCordova(this.path);
        var merges_path = path.join(util.appDir(projectRoot), 'merges', 'blackberry10');
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
    }
};
