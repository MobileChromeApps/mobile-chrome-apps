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

var fs = require('fs')  // use existsSync in 0.6.x
   , path = require('path')
   , common = require('./common')
   , xml_helpers = require(path.join(__dirname, '..', 'util', 'xml-helpers'));

var TARGETS = ["device", "simulator"];

module.exports = {
    www_dir:function(project_dir) {
        return path.join(project_dir, 'www');
    },
    package_name:function(project_dir) {
        var config_path = path.join(module.exports.www_dir(project_dir), 'config.xml');
        var widget_doc = xml_helpers.parseElementtreeSync(config_path);
        return widget_doc._root.attrib['id'];
    },
    "source-file":{
        install:function(source_el, plugin_dir, project_dir, plugin_id) {
            var src = source_el.attrib['src'];
            var target = source_el.attrib['target-dir'] || plugin_id;
            TARGETS.forEach(function(arch) {
                var dest = path.join("native", arch, "chrome", "plugin", target, path.basename(src));
                common.copyFile(plugin_dir, src, project_dir, dest);
            });
        },
        uninstall:function(source_el, project_dir, plugin_id) {
            var src = source_el.attrib['src'];
            var target = source_el.attrib['target-dir'] || plugin_id;
            TARGETS.forEach(function(arch) {
                var dest = path.join("native", arch, "chrome", "plugin", target, path.basename(src));
                common.removeFile(project_dir, dest);
            });
        }
    },
    "lib-file":{
        install:function(lib_el, plugin_dir, project_dir) {
            var src = lib_el.attrib.src;
            var arch = lib_el.attrib.arch;
            var dest = path.join("native", arch, "plugins", "jnext", path.basename(src));
            common.copyFile(plugin_dir, src, project_dir, dest);
        },
        uninstall:function(lib_el, project_dir) {
            var src = lib_el.attrib.src;
            var arch = lib_el.attrib.arch;
            var dest = path.join("native", arch, "plugins", "jnext", path.basename(src));
            common.removeFile(project_dir, dest);
        }
    }
};
