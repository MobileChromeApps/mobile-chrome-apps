/*
 *
 * Copyright 2013 Anis Kadri
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var path = require('path')
  , fs   = require('fs')
  , glob = require('glob')
  , xcode = require('xcode')
  , plist = require('plist')
  , shell = require('shelljs');

module.exports = {
    www_dir:function(project_dir) {
        return path.join(project_dir, 'www');
    },
    package_name:function(project_dir) {
        var plist_file = glob.sync(path.join(project_dir, '**', '*-Info.plist'))[0];
        return plist.parseFileSync(plist_file).CFBundleIdentifier;
    },
    "source-file":{
        install:function(source_el, plugin_dir, project_dir, plugin_id, project) {
            var src = source_el.attrib['src'];
            var srcFile = path.resolve(plugin_dir, src);
            var targetDir = path.resolve(project.plugins_dir, plugin_id, getRelativeDir(source_el));
            var destFile = path.resolve(targetDir, path.basename(src));
            var is_framework = source_el.attrib['framework'] && (source_el.attrib['framework'] == 'true' || source_el.attrib['framework'] == true);
            var has_flags = source_el.attrib['compiler-flags'] && source_el.attrib['compiler-flags'].length ? true : false ;

            if (!fs.existsSync(srcFile)) throw new Error('cannot find "' + srcFile + '" ios <source-file>');
            if (fs.existsSync(destFile)) throw new Error('target destination "' + destFile + '" already exists');
            var project_ref = path.join('Plugins', path.relative(project.plugins_dir, destFile));
            project.xcode.addSourceFile(project_ref, has_flags ? {compilerFlags:source_el.attrib['compiler-flags']} : {});
            if (is_framework) {
                var weak = source_el.attrib['weak'];
                var opt = { weak: (weak == undefined || weak == null || weak != 'true' ? false : true ) };
                var project_relative = path.join(path.basename(project.xcode_path), project_ref);
                project.xcode.addFramework(project_relative, opt);
                project.xcode.addToLibrarySearchPaths({path:project_ref});
            }
            shell.mkdir('-p', targetDir);
            shell.cp(srcFile, destFile);
        },
        uninstall:function(source_el, project_dir, plugin_id, project) {
            var src = source_el.attrib['src'];
            var targetDir = path.resolve(project.plugins_dir, plugin_id, getRelativeDir(source_el));
            var destFile = path.resolve(targetDir, path.basename(src));
            var is_framework = source_el.attrib['framework'] && (source_el.attrib['framework'] == 'true' || source_el.attrib['framework'] == true);

            var project_ref = path.join('Plugins', path.relative(project.plugins_dir, destFile));
            project.xcode.removeSourceFile(project_ref);
            if (is_framework) {
                var project_relative = path.join(path.basename(project.xcode_path), project_ref);
                project.xcode.removeFramework(project_relative);
                project.xcode.removeFromLibrarySearchPaths({path:project_ref});
            }
            shell.rm('-rf', destFile);
            
            if(fs.existsSync(targetDir) && fs.readdirSync(targetDir).length>0){
                shell.rm('-rf', targetDir); 
            }
        }
    },
    "header-file":{
        install:function(header_el, plugin_dir, project_dir, plugin_id, project) {
            var src = header_el.attrib['src'];
            var srcFile = path.resolve(plugin_dir, src);
            var targetDir = path.resolve(project.plugins_dir, plugin_id, getRelativeDir(header_el));
            var destFile = path.resolve(targetDir, path.basename(src));
            if (!fs.existsSync(srcFile)) throw new Error('cannot find "' + srcFile + '" ios <header-file>');
            if (fs.existsSync(destFile)) throw new Error('target destination "' + destFile + '" already exists');
            project.xcode.addHeaderFile(path.join('Plugins', path.relative(project.plugins_dir, destFile)));
            shell.mkdir('-p', targetDir);
            shell.cp(srcFile, destFile);
        },
        uninstall:function(header_el, project_dir, plugin_id, project) {
            var src = header_el.attrib['src'];
            var targetDir = path.resolve(project.plugins_dir, plugin_id, getRelativeDir(header_el));
            var destFile = path.resolve(targetDir, path.basename(src));
            project.xcode.removeHeaderFile(path.join('Plugins', path.relative(project.plugins_dir, destFile)));
            shell.rm('-rf', destFile);
            if(fs.existsSync(targetDir) && fs.readdirSync(targetDir).length>0){
                shell.rm('-rf', targetDir); 
            }
        }
    },
    "resource-file":{
        install:function(resource_el, plugin_dir, project_dir, project) {
            var src = resource_el.attrib['src'],
                srcFile = path.resolve(plugin_dir, src),
                destFile = path.resolve(project.resources_dir, path.basename(src));
            if (!fs.existsSync(srcFile)) throw new Error('cannot find "' + srcFile + '" ios <resource-file>');
            if (fs.existsSync(destFile)) throw new Error('target destination "' + destFile + '" already exists');
            project.xcode.addResourceFile(path.join('Resources', path.basename(src)));
            shell.cp('-R', srcFile, project.resources_dir);
        },
        uninstall:function(resource_el, project_dir, project) {
            var src = resource_el.attrib['src'],
                destFile = path.resolve(project.resources_dir, path.basename(src));
            project.xcode.removeResourceFile(path.join('Resources', path.basename(src)));
            shell.rm('-rf', destFile);
        }
    },
    parseIOSProjectFiles:function(project_dir) {
        // grab and parse pbxproj
        // we don't want CordovaLib's xcode project
        var project_files = glob.sync(path.join(project_dir, '*.xcodeproj', 'project.pbxproj'));
        
        if (project_files.length === 0) {
            throw new Error("does not appear to be an xcode project (no xcode project file)");
        }
        var pbxPath = project_files[0];
        var xcodeproj = xcode.project(pbxPath);
        xcodeproj.parseSync();

        // grab and parse plist file or config.xml
        var config_files = (glob.sync(path.join(project_dir, '**', '{PhoneGap,Cordova}.plist')).length == 0 ? 
                            glob.sync(path.join(project_dir, '**', 'config.xml')) :
                            glob.sync(path.join(project_dir, '**', '{PhoneGap,Cordova}.plist'))
                           );

        config_files = config_files.filter(function (val) {
            return !(/^build\//.test(val)) && !(/\/www\/config.xml$/.test(val));
        });

        if (config_files.length === 0) {
            throw new Error("could not find PhoneGap/Cordova plist file, or config.xml file.");
        }

        var config_file = config_files[0];
        var config_filename = path.basename(config_file);
        var xcode_dir = path.dirname(config_file);
        var pluginsDir = path.resolve(xcode_dir, 'Plugins');
        var resourcesDir = path.resolve(xcode_dir, 'Resources');

        return {
            plugins_dir:pluginsDir,
            resources_dir:resourcesDir,
            xcode:xcodeproj,
            xcode_path:xcode_dir,
            pbx:pbxPath
        };
    }
};

function getRelativeDir(file) {
    var targetDir = file.attrib['target-dir'];
    if (targetDir) {
        return targetDir;
    } else {
        return '';
    }
}
