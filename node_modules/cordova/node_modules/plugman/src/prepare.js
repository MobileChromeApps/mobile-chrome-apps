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

var platform_modules = require('./platforms'),
    path            = require('path'),
    config_changes  = require('./util/config-changes'),
    xml_helpers     = require('./util/xml-helpers'),
    wp7             = require('./platforms/wp7'),
    wp8             = require('./platforms/wp8'),
    windows8        = require('./platforms/windows8'),
    fs              = require('fs'),
    shell           = require('shelljs'),
    util            = require('util'),
    exec            = require('child_process').exec,
    et              = require('elementtree');

// Called on --prepare.
// Sets up each plugin's Javascript code to be loaded properly.
// Expects a path to the project (platforms/android in CLI, . in plugman-only),
// a path to where the plugins are downloaded, the www dir, and the platform ('android', 'ios', etc.).
module.exports = function handlePrepare(project_dir, platform, plugins_dir) {
    // Process:
    // - Do config munging by calling into config-changes module
    // - List all plugins in plugins_dir
    // - Load and parse their plugin.xml files.
    // - Skip those without support for this platform. (No <platform> tags means JS-only!)
    // - Build a list of all their js-modules, including platform-specific js-modules.
    // - For each js-module (general first, then platform) build up an object storing the path and any clobbers, merges and runs for it.
    // - Write this object into www/cordova_plugins.json.
    // - Cordova.js contains code to load them at runtime from that file.
    require('../plugman').emit('log', 'Preparing ' + platform + ' project...');
    var platform_json = config_changes.get_platform_json(plugins_dir, platform);
    var wwwDir = platform_modules[platform].www_dir(project_dir);

    // Check if there are any plugins queued for uninstallation, and if so, remove any of their plugin web assets loaded in
    // via <js-module> elements
    var plugins_to_uninstall = platform_json.prepare_queue.uninstalled;
    if (plugins_to_uninstall && plugins_to_uninstall.length) {
        var plugins_www = path.join(wwwDir, 'plugins');
        if (fs.existsSync(plugins_www)) {
            plugins_to_uninstall.forEach(function(plug) {
                var id = plug.id;
                var plugin_modules = path.join(plugins_www, id);
                if (fs.existsSync(plugin_modules)) {
                    require('../plugman').emit('log', 'Removing plugins directory from www "'+plugin_modules+'"');
                    shell.rm('-rf', plugin_modules);
                }
            });
        }
    }

    require('../plugman').emit('log', 'Processing configuration changes for plugins.');
    config_changes.process(plugins_dir, project_dir, platform);

    // for windows phone plaform we need to add all www resources to the .csproj file
    // first we need to remove them all to prevent duplicates
    var wp_csproj;
    if(platform == 'wp7' || platform == 'wp8') {
        wp_csproj = (platform == wp7? wp7.parseProjectFile(project_dir) : wp8.parseProjectFile(project_dir));
        var item_groups = wp_csproj.xml.findall('ItemGroup');
        for (var i = 0, l = item_groups.length; i < l; i++) {
            var group = item_groups[i];
            var files = group.findall('Content');
            for (var j = 0, k = files.length; j < k; j++) {
                var file = files[j];
                if (file.attrib.Include.substr(0,11) == "www\\plugins" || file.attrib.Include == "www\\cordova_plugins.js") {
                    // remove file reference
                    group.remove(0, file);
                    // remove ItemGroup if empty
                    var new_group = group.findall('Content');
                    if(new_group.length < 1) {
                        wp_csproj.xml.getroot().remove(0, group);
                    }
                }
            }
        }
    }
    else if(platform == "windows8") {
        wp_csproj = windows8.parseProjectFile(project_dir);
        var item_groups = wp_csproj.xml.findall('ItemGroup');
        for (var i = 0, l = item_groups.length; i < l; i++) {
            var group = item_groups[i];
            var files = group.findall('Content');
            for (var j = 0, k = files.length; j < k; j++) {
                var file = files[j];
                if (file.attrib.Include.substr(0,11) == "www\\plugins" || file.attrib.Include == "www\\cordova_plugins.js") {
                    // remove file reference
                    group.remove(0, file);
                    // remove ItemGroup if empty
                    var new_group = group.findall('Content');
                    if(new_group.length < 1) {
                        wp_csproj.xml.getroot().remove(0, group);
                    }
                }
            }
        }

    }

    platform_json = config_changes.get_platform_json(plugins_dir, platform);
    // This array holds all the metadata for each module and ends up in cordova_plugins.json
    var plugins = Object.keys(platform_json.installed_plugins).concat(Object.keys(platform_json.dependent_plugins));
    var moduleObjects = [];
    require('../plugman').emit('log', 'Iterating over installed plugins:', plugins);

    plugins && plugins.forEach(function(plugin) {
        var pluginDir = path.join(plugins_dir, plugin);
        if(fs.statSync(pluginDir).isDirectory()){
            var xml = xml_helpers.parseElementtreeSync(path.join(pluginDir, 'plugin.xml'));
    
            var plugin_id = xml.getroot().attrib.id;
    
            // add the plugins dir to the platform's www.
            var platformPluginsDir = path.join(wwwDir, 'plugins');
            // XXX this should not be here if there are no js-module. It leaves an empty plugins/ directory
            shell.mkdir('-p', platformPluginsDir);
    
            var generalModules = xml.findall('./js-module');
            var platformTag = xml.find(util.format('./platform[@name="%s"]', platform));
    
            generalModules = generalModules || [];
            var platformModules = platformTag ? platformTag.findall('./js-module') : [];
            var allModules = generalModules.concat(platformModules);
    
            allModules.forEach(function(module) {
                // Copy the plugin's files into the www directory.
                // NB: We can't always use path.* functions here, because they will use platform slashes.
                // But the path in the plugin.xml and in the cordova_plugins.js should be always forward slashes.
                var pathParts = module.attrib.src.split('/');

                var fsDirname = path.join.apply(path, pathParts.slice(0, -1));
                var fsDir = path.join(platformPluginsDir, plugin_id, fsDirname);
                shell.mkdir('-p', fsDir);
    
                // Read in the file, prepend the cordova.define, and write it back out.
                var moduleName = plugin_id + '.';
                if (module.attrib.name) {
                    moduleName += module.attrib.name;
                } else {
                    var result = module.attrib.src.match(/([^\/]+)\.js/);
                    moduleName += result[1];
                }
    
                var fsPath = path.join.apply(path, pathParts);
                var scriptContent = fs.readFileSync(path.join(pluginDir, fsPath), 'utf-8');
                scriptContent = 'cordova.define("' + moduleName + '", function(require, exports, module) {' + scriptContent + '});\n';
                fs.writeFileSync(path.join(platformPluginsDir, plugin_id, fsPath), scriptContent, 'utf-8');
                if(platform == 'wp7' || platform == 'wp8' || platform == "windows8") {
                    wp_csproj.addSourceFile(path.join('www', 'plugins', plugin_id, fsPath));
                }
    
                // Prepare the object for cordova_plugins.json.
                var obj = {
                    file: ['plugins', plugin_id, module.attrib.src].join('/'),
                    id: moduleName
                };
    
                // Loop over the children of the js-module tag, collecting clobbers, merges and runs.
                module.getchildren().forEach(function(child) {
                    if (child.tag.toLowerCase() == 'clobbers') {
                        if (!obj.clobbers) {
                            obj.clobbers = [];
                        }
                        obj.clobbers.push(child.attrib.target);
                    } else if (child.tag.toLowerCase() == 'merges') {
                        if (!obj.merges) {
                            obj.merges = [];
                        }
                        obj.merges.push(child.attrib.target);
                    } else if (child.tag.toLowerCase() == 'runs') {
                        obj.runs = true;
                    }
                });
    
                // Add it to the list of module objects bound for cordova_plugins.json
                moduleObjects.push(obj);
            });
        }
    });

    // Write out moduleObjects as JSON wrapped in a cordova module to cordova_plugins.js
    var final_contents = "cordova.define('cordova/plugin_list', function(require, exports, module) {\n";
    final_contents += 'module.exports = ' + JSON.stringify(moduleObjects,null,'    ') + '\n});';
    require('../plugman').emit('log', 'Writing out cordova_plugins.js...');
    fs.writeFileSync(path.join(wwwDir, 'cordova_plugins.js'), final_contents, 'utf-8');

    if(platform == 'wp7' || platform == 'wp8' || platform == "windows8") {
        wp_csproj.addSourceFile(path.join('www', 'cordova_plugins.js'));
        wp_csproj.write();
    }
};
