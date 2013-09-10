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

var http = require('http'),
    os = require('os'),
    path = require('path'),
    fs = require('fs'),
    util = require('util'),
    shell = require('shelljs'),
    xml_helpers = require('./xml-helpers');

module.exports = {
    searchAndReplace:require('./search-and-replace'),
    // Fetches plugin information from remote server
    clonePluginGitRepo:function(plugin_git_url, plugins_dir, subdir, git_ref, callback) {
        if(!shell.which('git')) {
            var err = new Error('"git" command line tool is not installed: make sure it is accessible on your PATH.');
            if (callback) return callback(err);
            else throw err;
        }
        var tmp_dir = path.join(os.tmpdir(), 'plugman-tmp' +(new Date).valueOf());

        shell.rm('-rf', tmp_dir);

        shell.cd(path.dirname(tmp_dir));
        var cmd = util.format('git clone "%s" "%s"', plugin_git_url, path.basename(tmp_dir));
        require('../../plugman').emit('log', 'Fetching plugin via git-clone command: ' + cmd);
        shell.exec(cmd, {silent: true, async:true}, function(code, output) {
            if (code > 0) {
                var err = new Error('failed to get the plugin via git from URL '+ plugin_git_url + ', output: ' + output);
                if (callback) return callback(err)
                else throw err;
            } else {
                require('../../plugman').emit('log', 'Plugin "' + plugin_git_url + '" fetched.');
                // Check out the specified revision, if provided.
                if (git_ref) {
                    var cmd = util.format('cd "%s" && git checkout "%s"', tmp_dir, git_ref);
                    var result = shell.exec(cmd, { silent: true, async:false });
                    if (result.code > 0) {
                        var err = new Error('failed to checkout git ref "' + git_ref + '" for plugin at git url "' + plugin_git_url + '", output: ' + result.output);
                        if (callback) return callback(err);
                        else throw err;
                    }
                    require('../../plugman').emit('log', 'Plugin "' + plugin_git_url + '" checked out to git ref "' + git_ref + '".');
                }

                // Read the plugin.xml file and extract the plugin's ID.
                tmp_dir = path.join(tmp_dir, subdir);
                // TODO: what if plugin.xml does not exist?
                var xml_file = path.join(tmp_dir, 'plugin.xml');
                var xml = xml_helpers.parseElementtreeSync(xml_file);
                var plugin_id = xml.getroot().attrib.id;

                // TODO: what if a plugin dependended on different subdirectories of the same plugin? this would fail.
                // should probably copy over entire plugin git repo contents into plugins_dir and handle subdir seperately during install.
                var plugin_dir = path.join(plugins_dir, plugin_id);
                require('../../plugman').emit('log', 'Copying fetched plugin over "' + plugin_dir + '"...');
                shell.cp('-R', path.join(tmp_dir, '*'), plugin_dir);

                require('../../plugman').emit('log', 'Plugin "' + plugin_id + '" fetched.');
                if (callback) callback(null, plugin_dir);
            }
        });
    }
};

