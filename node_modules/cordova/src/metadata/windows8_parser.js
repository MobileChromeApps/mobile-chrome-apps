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
    config        = require('../config'),
    hooker        = require('../hooker');

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
    if (custom_path) {
        lib_path = path.join(custom_path, "windows8");
    }
    var command = '"' + path.join(lib_path, 'bin', 'check_reqs') + '"';
    events.emit('verbose', 'Running "' + command + '" (output to follow)');
    var d = Q.defer();
    
    child_process.exec(command, function(err, output, stderr) {
        events.emit('verbose', output);
        if (err) {
            d.reject(new Error('Requirements check failed: ' + output + stderr));
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

        var version = this.fixConfigVersion(config.version());
        var name = config.name();
        var pkgName = config.packageName();
        var author = config.author();

        var identityNode = manifest.find('.//Identity');
        if(identityNode) {
            // Update app name in identity
            var appIdName = identityNode['attrib']['Name'];
            if (appIdName != pkgName) {
                identityNode['attrib']['Name'] = pkgName;
            }

            // Update app version
            var appVersion = identityNode['attrib']['Version'];
            if(appVersion != version) {
                identityNode['attrib']['Version'] = version;
            }
        }

        // Update name (windows8 has it in the Application[@Id] and Application.VisualElements[@DisplayName])
        var app = manifest.find('.//Application');
        if(app) {

            var appId = app['attrib']['Id'];

            if (appId != pkgName) {
                app['attrib']['Id'] = pkgName;
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

        // Update properties
        var properties = manifest.find('.//Properties');
        if (properties && properties.find) {
            var displayNameElement = properties.find('.//DisplayName');
            if (displayNameElement && displayNameElement.text != name) {
                displayNameElement.text = name;
            }

            var publisherNameElement = properties.find('.//PublisherDisplayName');
            if (publisherNameElement && publisherNameElement.text != author) {
                publisherNameElement.text = author;
            }
        }

        // sort Capability elements as per CB-5350 Windows8 build fails due to invalid 'Capabilities' definition
        // to sort elements we remove them and then add again in the appropriate order
        var capabilitiesRoot = manifest.find('.//Capabilities'),
            capabilities = capabilitiesRoot._children || [];

        capabilities.forEach(function(elem){
            capabilitiesRoot.remove(0, elem);
        });
        capabilities.sort(function(a, b) {
            return (a.tag > b.tag)? 1: -1;
        });
        capabilities.forEach(function(elem){
            capabilitiesRoot.append(elem);
        });

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

    // Used for creating platform_www in projects created by older versions.
    cordovajs_path:function(libDir) {
        var jsPath = path.join(libDir, "template", 'www', 'cordova.js');
        return path.resolve(jsPath);
    },

    // Replace the www dir with contents of platform_www and app www and updates the csproj file.
    update_www:function() {
        var projectRoot = util.isCordova(this.windows8_proj_dir);
        var app_www = util.projectWww(projectRoot);
        var platform_www = path.join(this.windows8_proj_dir, 'platform_www');

        // Clear the www dir
        shell.rm('-rf', this.www_dir());
        shell.mkdir(this.www_dir());
        // Copy over all app www assets
        shell.cp('-rf', path.join(app_www, '*'), this.www_dir());

        // Copy all files from merges directory.
        this.copy_merges('windows8');

        // Copy over stock platform www assets (cordova.js)
        shell.cp('-rf', path.join(platform_www, '*'), this.www_dir());
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
    // Returns an array of all the files in the given directory with relative paths
    // - name     : the name of the top level directory (i.e all files will start with this in their path)
    // - dir     : the directory whos contents will be listed under 'name' directory
    folder_contents:function(name, dir) {
        var results = [];
        var folder_dir = fs.readdirSync(dir);
        for(item in folder_dir) {
            var stat = fs.statSync(path.join(dir, folder_dir[item]));

            if(stat.isDirectory()) {
                var sub_dir = this.folder_contents(path.join(name, folder_dir[item]), path.join(dir, folder_dir[item]));
                //Add all subfolder item paths
                for(sub_item in sub_dir) {
                    results.push(sub_dir[sub_item]);
                }
            }
            else if(stat.isFile()) {
                results.push(path.join(name, folder_dir[item]));
            }
            // else { it is a FIFO, or a Socket, Symbolic Link or something ... } 
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

        var that = this;
        var projectRoot = util.isCordova(process.cwd());

        var hooks = new hooker(projectRoot);
        return hooks.fire('pre_package', { wwwPath:this.www_dir() })
        .then(function() {
            // overrides (merges) are handled in update_www()
            that.update_jsproj();
            that.update_staging();
            //that.add_bom();

            util.deleteSvnFolders(that.www_dir());
        });
    },

    // Adjust version number as per CB-5337 Windows8 build fails due to invalid app version
    fixConfigVersion: function (version) {
        if(version && version.match(/\.\d/g)) {
            var numVersionComponents = version.match(/\.\d/g).length + 1;
            while (numVersionComponents++ < 4) {
                version += '.0';
            }
        }
        return version;
    },

    // CB-5421 Add BOM to all html, js, css files to ensure app can pass Windows Store Certification
    add_bom: function () {
        var www = this.www_dir();
        var files = shell.ls('-R', www);

        files.forEach(function (file) {
            if (!file.match(/\.(js|html|css|json)/)) {
                return;
            }

            var filePath = path.join(www, file);
            var content = fs.readFileSync(filePath);

            if (content[0] !== 0xEF && content[1] !== 0xBE && content[2] !== 0xBB) {
                fs.writeFileSync(filePath, '\ufeff' + content);
            }
        });
    }
};
