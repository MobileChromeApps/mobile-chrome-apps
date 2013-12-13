/*
 *
 * Copyright 2013 Canonical Ltd.
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

function replaceAt(str, index, char) {
    return str.substr(0, index) + char + str.substr(index + char.length);
}

function toCamelCase(str) {
    return str.split('-').map(function(str) {
        return replaceAt(str, 0, str[0].toUpperCase());
    }).join('');
}

var fs = require('fs')
   , path = require('path')
   , xml_helpers = require(path.join(__dirname, '..', 'util', 'xml-helpers'));

module.exports = {
    www_dir:function(project_dir) {
        return path.join(project_dir, 'www');
    },

    package_name:function (project_dir) {
        var config_path = path.join(project_dir, 'config.xml');
        var widget_doc = xml_helpers.parseElementtreeSync(config_path);
        return widget_doc._root.attrib['id'];
    },
    "source-file":{
        install:function(source_el, plugin_dir, project_dir, plugin_id) {
            var shell = require('shelljs');
            var dest = path.join(project_dir, "build", "src", "plugins", plugin_id);
            shell.mkdir(dest);
            shell.cp(path.join(plugin_dir, source_el.attrib.src), dest);

            shell.exec('touch ' + path.join(project_dir, "CMakeLists.txt"))
        },
        uninstall:function(source_el, project_dir, plugin_id) {
            var shell = require('shelljs');

            var dest = path.join(project_dir, "build", "src", "plugins", plugin_id);
            shell.rm(path.join(dest, path.basename(source_el.attrib.src)));
        }
    },
    "header-file":{
        install:function(source_el, plugin_dir, project_dir, plugin_id) {
            var shell = require('shelljs');
            var dest = path.join(project_dir, "build", "src", "plugins", plugin_id);
            shell.mkdir(dest);
            shell.cp(path.join(plugin_dir, source_el.attrib.src), dest);

            var plugins = path.join(project_dir, "build", "src", "coreplugins.cpp");
            src = String(fs.readFileSync(plugins));

            src = src.replace('INSERT_HEADER_HERE', '#include "plugins/' + plugin_id + "/" + path.basename(source_el.attrib.src) +'"\nINSERT_HEADER_HERE');
            var class_name = plugin_id.match(/\.[^.]+$/)[0].substr(1);
            class_name = toCamelCase(class_name);
            src = src.replace('INSERT_PLUGIN_HERE', 'INIT_PLUGIN(' + class_name + ');INSERT_PLUGIN_HERE');

            fs.writeFileSync(plugins, src);
        },
        uninstall:function(source_el, project_dir, plugin_id) {
            var shell = require('shelljs');
            var dest = path.join(project_dir, "build", "src", "plugins", plugin_id);
            shell.rm(path.join(dest, path.basename(source_el.attrib.src)));

            var plugins = path.join(project_dir, "build", "src", "coreplugins.cpp");
            src = String(fs.readFileSync(plugins));

            src = src.replace('#include "plugins/' + plugin_id + "/" + path.basename(source_el.attrib.src) +'"', '');
            var class_name = plugin_id.match(/\.[^.]+$/)[0].substr(1);
            class_name = toCamelCase(class_name);
            src = src.replace('INIT_PLUGIN(' + class_name + ');', '');

            fs.writeFileSync(plugins, src);
        }
    },
    "resource-file":{
        install:function(source_el, plugin_dir, project_dir, plugin_id) {
            var shell = require('shelljs');
            var dest = path.join(project_dir, "qml");
            shell.mkdir(dest);
            shell.cp(path.join(plugin_dir, source_el.attrib.src), dest);
        },
        uninstall:function(source_el, project_dir, plugin_id) {
            var shell = require('shelljs');

            var dest = path.join(project_dir, "qml");
            shell.rm(path.join(dest, path.basename(source_el.attrib.src)));
        }
    }
};
