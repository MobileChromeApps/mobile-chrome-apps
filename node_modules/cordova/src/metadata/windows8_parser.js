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
    events        = require('../events'),
    Q             = require('q'),
    child_process = require('child_process'),
    config_parser = require('../config_parser'),
    xml           = require('../xml-helpers'),
    config        = require('../config');

module.exports = function windows8_parser(project) {
    try {
        // TODO : Check that it's not a windows8 project?
        var jsproj_file   = fs.readdirSync(project).filter(function(e) { return e.match(/\.jsproj$/i); })[0];
        if (!jsproj_file) throw new Error('No .jsproj file.');
        this.windows8_proj_dir = project;
        this.jsproj_path  = path.join(this.windows8_proj_dir, jsproj_file);
        this.sln_path     = path.join(this.windows8_proj_dir, jsproj_file.replace(/\.jsproj/, '.sln'));
    } catch(e) {
        throw new Error('The provided path "' + project + '" is not a Windows 8 project. ' + e);
    }
    this.manifest_path  = path.join(this.windows8_proj_dir, 'package.appxmanifest');
    this.config_path = this.config_xml();
    this.config = new util.config_parser(this.config_path);
};

// Returns a promise
module.exports.check_requirements = function(project_root) {
    events.emit('log', 'Checking windows8 requirements...');
    var lib_path = path.join(util.libDirectory, 'windows8', 'cordova',
                    require('../../platforms').windows8.version, 'windows8');

    var custom_path = config.has_custom_path(project_root, 'windows8');
    if (custom_path) lib_path = custom_path;
    var command = '"' + path.join(lib_path, 'bin', 'check_reqs') + '"';
    events.emit('verbose', 'Running "' + command + '" (output to follow)');
    var d = Q.defer();
    
    child_process.exec(command, function(err, output, stderr) {
        events.emit('verbose', output);
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

        //check config parser
        if (config instanceof config_parser) {
        } else throw new Error('update_from_config requires a config_parser object');

        //Get manifest file
        var manifest = xml.parseElementtreeSync(this.manifest_path);

        //Update app version
        var version = config.version();
        var identityNode = manifest.find('.//Identity');
        if(identityNode) {
            var appVersion = identityNode['attrib']['Version'];
            if(appVersion != version) {
                identityNode['attrib']['Version'] = version;
            }
        }

        // update name ( windows8 has it in the Application[@Id] and Application.VisualElements[@DisplayName])
        var name = config.name();
        var app = manifest.find('.//Application');
        if(app) {

            var appId = app['attrib']['Id'];

            if(appId != name) {
                app['attrib']['Id'] = name;
            }

            var visualElems = manifest.find('.//VisualElements');

            if(visualElems) {
                var displayName = visualElems['attrib']['DisplayName'];
                if(displayName != name) {
                    visualElems['attrib']['DisplayName'] = name;
                }
            }
            else {
                throw new Error('update_from_config expected a valid package.appxmanifest' +
                                ' with a <VisualElements> node');
            }
        }
        else {
            throw new Error('update_from_config expected a valid package.appxmanifest' +
                            ' with a <Application> node');
        }




         // Update content (start page) element
         this.config.content(config.content());

         //Write out manifest
         fs.writeFileSync(this.manifest_path, manifest.write({indent: 4}), 'utf-8');

    },
    // Returns the platform-specific www directory.
    www_dir:function() {
        return path.join(this.windows8_proj_dir, 'www');
    },
    config_xml:function() {
        return path.join(this.windows8_proj_dir,"config.xml");
    },
    // copy files from merges directory to actual www dir
    copy_merges:function(merges_sub_path) {
        var merges_path = path.join(util.appDir(util.isCordova(this.windows8_proj_dir)), 'merges', merges_sub_path);
        if (fs.existsSync(merges_path)) {
            var overrides = path.join(merges_path, '*');
            shell.cp('-rf', overrides, this.www_dir());
        }
    },
    // copies the app www folder into the windows8 project's www folder and updates the jsproj file.
    update_www:function(libDir) {
        var project_root = util.isCordova(this.windows8_proj_dir);
        var project_www = util.projectWww(project_root);
        // remove stock platform assets
        shell.rm('-rf', this.www_dir());
        // copy over all app www assets
        shell.cp('-rf', project_www, this.windows8_proj_dir);

        // copy all files from merges directories (generic first, then specific)
        this.copy_merges('windows8');

        // copy over windows8 lib's cordova.js
        var cordovajs_path = path.join(libDir, 'windows8', "template", 'www', 'cordova.js');
        fs.writeFileSync(path.join(this.www_dir(), 'cordova.js'), fs.readFileSync(cordovajs_path, 'utf-8'), 'utf-8');
        this.update_jsproj();
    },
    // updates the jsproj file to explicitly list all www content.
    update_jsproj:function() {
        var jsproj_xml = xml.parseElementtreeSync(this.jsproj_path);
        // remove any previous references to the www files
        var item_groups = jsproj_xml.findall('ItemGroup');
        for (var i = 0, l = item_groups.length; i < l; i++) {
            var group = item_groups[i];
            var files = group.findall('Content');
            for (var j = 0, k = files.length; j < k; j++) {
                var file = files[j];
                if (file.attrib.Include.substr(0, 3) == 'www') {
                    // remove file reference
                    group.remove(0, file);
                    // remove ItemGroup if empty
                    var new_group = group.findall('Content');
                    if(new_group.length < 1) {
                        jsproj_xml.getroot().remove(0, group);
                    }
                }
            }
        }

        // now add all www references back in from the root www folder
        var project_root = util.isCordova(this.windows8_proj_dir);
        var www_files = this.folder_contents('www', this.www_dir());
        for(file in www_files) {
            var item = new et.Element('ItemGroup');
            var content = new et.Element('Content');
            content.attrib.Include = www_files[file];
            item.append(content);
            jsproj_xml.getroot().append(item);
        }
        // save file
        fs.writeFileSync(this.jsproj_path, jsproj_xml.write({indent:4}), 'utf-8');
    },
    // Returns an array of all the files in the given directory with reletive paths
    // - name     : the name of the top level directory (i.e all files will start with this in their path)
    // - path     : the directory whos contents will be listed under 'name' directory
    folder_contents:function(name, dir) {
        var results = [];
        var folder_dir = fs.readdirSync(dir);
        for(item in folder_dir) {
            var stat = fs.statSync(path.join(dir, folder_dir[item]));
            // means its a folder?
            if(stat.size == 0) {
                var sub_dir = this.folder_contents(path.join(name, folder_dir[item]), path.join(dir, folder_dir[item]));
                //Add all subfolder item paths
                for(sub_item in sub_dir) {
                    results.push(sub_dir[sub_item]);
                }
            }
            else {
                results.push(path.join(name, folder_dir[item]));
            }
        }
        return results;
    },
    staging_dir: function() {
        return path.join(this.windows8_proj_dir, '.staging', 'www');
    },

    update_staging: function() {
        var projectRoot = util.isCordova(this.windows8_proj_dir);
        if (fs.existsSync(this.staging_dir())) {
            var staging = path.join(this.staging_dir(), '*');
            shell.cp('-rf', staging, this.www_dir());
        }
    },

    // calls the nessesary functions to update the windows8 project
    update_project:function(cfg) {
        //console.log("Updating windows8 project...");

        try {
            this.update_from_config(cfg);
        } catch(e) {
            return Q.reject(e);
        }
        // overrides (merges) are handled in update_www()
        this.update_www();
        this.update_staging();
        util.deleteSvnFolders(this.www_dir());
        return Q();
    }
};
