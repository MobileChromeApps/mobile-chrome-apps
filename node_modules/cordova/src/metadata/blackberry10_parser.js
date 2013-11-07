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
    shell         = require('shelljs'),
    util          = require('../util'),
    Q             = require('q'),
    child_process = require('child_process'),
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

// Returns a promise.
module.exports.check_requirements = function(project_root) {
    var lib_path = path.join(util.libDirectory, 'blackberry10', 'cordova', require('../../platforms').blackberry10.version);
    var d = Q.defer();
    child_process.exec("\"" + path.join(lib_path, 'bin', 'check_reqs') + "\"", function(err, output, stderr) {
        if (err) {
            d.reject(new Error('Error while checking requirements: ' + output + stderr));
        } else {
            d.resolve();
        }
    });
    return d.promise;
};

module.exports.prototype = {
    update_from_config:function(config) {
        if (config instanceof config_parser) {
        } else throw new Error('update_from_config requires a config_parser object');
    },

    // Returns a promise.
    update_project:function(cfg) {
        var self = this;

        try {
            self.update_from_config(cfg);
        } catch(e) {
            return Q.reject(e);
        }
        self.update_overrides();
        self.update_staging();
        util.deleteSvnFolders(this.www_dir());
        return Q();
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

    update_www:function(libDir) {
        var projectRoot = util.isCordova(this.path),
            www = util.projectWww(projectRoot),
            platformWww = this.www_dir(),
            platform_cfg_backup = new util.config_parser(this.config_path);


        // remove the stock www folder
        shell.rm('-rf', this.www_dir());
        // copy over project www assets
        shell.cp('-rf', www, this.path);
        //Re-Write config.xml
        platform_cfg_backup.update();

        // add cordova.js
        shell.cp('-f', path.join(libDir, 'javascript', 'cordova.blackberry10.js'), path.join(this.www_dir(), 'cordova.js'));
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
