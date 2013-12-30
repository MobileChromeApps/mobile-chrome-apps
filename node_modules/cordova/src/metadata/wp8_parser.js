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
    child_process = require('child_process'),
    Q             = require('q'),
    config_parser = require('../config_parser'),
    xml           = require('../xml-helpers'),
    config        = require('../config'),
    hooker        = require('../hooker');

module.exports = function wp8_parser(project) {
    try {
        // TODO : Check that it's not a wp8 project?
        var csproj_file   = fs.readdirSync(project).filter(function(e) { return e.match(/\.csproj$/i); })[0];
        if (!csproj_file) throw new Error('No .csproj file.');
        this.wp8_proj_dir = project;
        this.csproj_path  = path.join(this.wp8_proj_dir, csproj_file);
        this.sln_path     = path.join(this.wp8_proj_dir, csproj_file.replace(/\.csproj/, '.sln'));
    } catch(e) {
        throw new Error('The provided path "' + project + '" is not a Windows Phone 8 project. ' + e);
    }
    this.manifest_path  = path.join(this.wp8_proj_dir, 'Properties', 'WMAppManifest.xml');
    this.config_path = path.join(this.wp8_proj_dir, 'config.xml');
    this.config = new util.config_parser(this.config_path);
};

// Returns a promise.
module.exports.check_requirements = function(project_root) {
    events.emit('log', 'Checking wp8 requirements...');
    var lib_path = path.join(util.libDirectory, 'wp', 'cordova', require('../../platforms').wp8.version, 'wp8');
    var custom_path = config.has_custom_path(project_root, 'wp8');
    if (custom_path) {
        lib_path = path.join(custom_path, 'wp8');
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

        //Update app version
        var version = config.version();
        manifest.find('.//App').attrib.Version = version;

        // Update app name by editing app title in Properties\WMAppManifest.xml
        var name = config.name();
        var prev_name = manifest.find('.//App[@Title]')['attrib']['Title'];
        if(prev_name != name) {
            //console.log("Updating app name from " + prev_name + " to " + name);
            manifest.find('.//App').attrib.Title = name;
            manifest.find('.//App').attrib.Publisher = name + " Publisher";
            manifest.find('.//App').attrib.Author = name + " Author";
            manifest.find('.//PrimaryToken').attrib.TokenID = name;
            //update name of sln and csproj.
            name = name.replace(/(\.\s|\s\.|\s+|\.+)/g, '_'); //make it a ligitamate name
            prev_name = prev_name.replace(/(\.\s|\s\.|\s+|\.+)/g, '_');
            // TODO: might return .sln.user? (generated file)
            var sln_name = fs.readdirSync(this.wp8_proj_dir).filter(function(e) { return e.match(/\.sln$/i); })[0];
            var sln_path = path.join(this.wp8_proj_dir, sln_name);
            var sln_file = fs.readFileSync(sln_path, 'utf-8');
            var name_regex = new RegExp(prev_name, "g");
            fs.writeFileSync(sln_path, sln_file.replace(name_regex, name), 'utf-8');
            shell.mv('-f', this.csproj_path, path.join(this.wp8_proj_dir, name + '.csproj'));
            this.csproj_path = path.join(this.wp8_proj_dir, name + '.csproj');
            shell.mv('-f', sln_path, path.join(this.wp8_proj_dir, name + '.sln'));
            this.sln_path    = path.join(this.wp8_proj_dir, name + '.sln');
        }

        // Update package name by changing:
        /*  - CordovaAppProj.csproj
         *  - MainPage.xaml
         *  - MainPage.xaml.cs
         *  - App.xaml
         *  - App.xaml.cs
         */
         var pkg = config.packageName();
         var csproj = xml.parseElementtreeSync(this.csproj_path);
         prev_name = csproj.find('.//RootNamespace').text;
         if(prev_name != pkg) {
            //console.log("Updating package name from " + prev_name + " to " + pkg);
            //CordovaAppProj.csproj
            csproj.find('.//RootNamespace').text = pkg;
            csproj.find('.//AssemblyName').text = pkg;
            csproj.find('.//XapFilename').text = pkg + '.xap';
            csproj.find('.//SilverlightAppEntry').text = pkg + '.App';
            fs.writeFileSync(this.csproj_path, csproj.write({indent: 4}), 'utf-8');
            //MainPage.xaml
            var mainPageXAML = xml.parseElementtreeSync(path.join(this.wp8_proj_dir, 'MainPage.xaml'));
            mainPageXAML.getroot().attrib['x:Class'] = pkg + '.MainPage';
            fs.writeFileSync(path.join(this.wp8_proj_dir, 'MainPage.xaml'), mainPageXAML.write({indent: 4}), 'utf-8');
            //MainPage.xaml.cs
            var mainPageCS = fs.readFileSync(path.join(this.wp8_proj_dir, 'MainPage.xaml.cs'), 'utf-8');
            var namespaceRegEx = new RegExp('namespace ' + prev_name);
            fs.writeFileSync(path.join(this.wp8_proj_dir, 'MainPage.xaml.cs'), mainPageCS.replace(namespaceRegEx, 'namespace ' + pkg), 'utf-8');
            //App.xaml
            var appXAML = xml.parseElementtreeSync(path.join(this.wp8_proj_dir, 'App.xaml'));
            appXAML.getroot().attrib['x:Class'] = pkg + '.App';
            fs.writeFileSync(path.join(this.wp8_proj_dir, 'App.xaml'), appXAML.write({indent: 4}), 'utf-8');
            //App.xaml.cs
            var appCS = fs.readFileSync(path.join(this.wp8_proj_dir, 'App.xaml.cs'), 'utf-8');
            fs.writeFileSync(path.join(this.wp8_proj_dir, 'App.xaml.cs'), appCS.replace(namespaceRegEx, 'namespace ' + pkg), 'utf-8');
         }

         //Write out manifest
         fs.writeFileSync(this.manifest_path, manifest.write({indent: 4}), 'utf-8');
    },
    // Returns the platform-specific www directory.
    www_dir:function() {
        return path.join(this.wp8_proj_dir, 'www');
    },
    config_xml:function() {
        return this.config_path;
    },
    // copy files from merges directory to actual www dir
    copy_merges:function(merges_sub_path) {
        var merges_path = path.join(util.appDir(util.isCordova(this.wp8_proj_dir)), 'merges', merges_sub_path);
        if (fs.existsSync(merges_path)) {
            var overrides = path.join(merges_path, '*');
            shell.cp('-rf', overrides, this.www_dir());
        }
    },

    // Used for creating platform_www in projects created by older versions.
    cordovajs_path:function(libDir) {
        var jsPath = path.join(libDir, '..', 'common', 'www', 'cordova.js');
        return path.resolve(jsPath);
    },

    // Replace the www dir with contents of platform_www and app www and updates the csproj file.
    update_www:function() {
        var projectRoot = util.isCordova(this.wp8_proj_dir);
        var app_www = util.projectWww(projectRoot);
        var platform_www = path.join(this.wp8_proj_dir, 'platform_www');

        // Clear the www dir
        shell.rm('-rf', this.www_dir());
        shell.mkdir(this.www_dir());
        // Copy over all app www assets
        shell.cp('-rf', path.join(app_www, '*'), this.www_dir());

        // Copy all files from merges directories - wp generic first, then wp8 specific.
        this.copy_merges('wp');
        this.copy_merges('wp8');

        // Copy over stock platform www assets (cordova.js)
        shell.cp('-rf', path.join(platform_www, '*'), this.www_dir());
    },

    // updates the csproj file to explicitly list all www content.
    update_csproj:function() {
        var csproj_xml = xml.parseElementtreeSync(this.csproj_path);
        // remove any previous references to the www files
        var item_groups = csproj_xml.findall('ItemGroup');
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
                        csproj_xml.getroot().remove(0, group);
                    }
                }
            }
        }

        // now add all www references back in from the root www folder
        var www_files = this.folder_contents('www', this.www_dir());
        for(file in www_files) {
            var item = new et.Element('ItemGroup');
            var content = new et.Element('Content');
            content.attrib.Include = www_files[file];
            item.append(content);
            csproj_xml.getroot().append(item);
        }
        // save file
        fs.writeFileSync(this.csproj_path, csproj_xml.write({indent:4}), 'utf-8');
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
            // else { it is a FIFO, or a Socket or something ... }
        }
        return results;
    },
    staging_dir: function() {
        return path.join(this.wp8_proj_dir, '.staging', 'www');
    },

    update_staging: function() {
        var projectRoot = util.isCordova(this.wp8_proj_dir);
        if (fs.existsSync(this.staging_dir())) {
            var staging = path.join(this.staging_dir(), '*');
            shell.cp('-rf', staging, this.www_dir());
        }
    },

    // calls the nessesary functions to update the wp8 project
    // Returns a promise.
    update_project:function(cfg) {
        try {
            this.update_from_config(cfg);
        } catch(e) {
            return Q.reject(e);
        }

        // trigger an event in case anyone needs to modify the contents of the www folder before we package it.
        var that = this;
        var projectRoot = util.isCordova(process.cwd());

        var hooks = new hooker(projectRoot);
        return hooks.fire('pre_package', { wwwPath:this.www_dir() })
        .then(function() {
            that.update_csproj();
            that.update_staging();
            util.deleteSvnFolders(that.www_dir());
        });
    }
};
