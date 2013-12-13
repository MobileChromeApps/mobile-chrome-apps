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
    child_process = require('child_process'),
    Q = require('q'),
    xml_helpers = require('./xml-helpers');

module.exports = {
    searchAndReplace:require('./search-and-replace'),

    // Fetches plugin information from remote server.
    // Returns a promise.
    clonePluginGitRepo:function(plugin_git_url, plugins_dir, subdir, git_ref) {
        if(!shell.which('git')) {
            return Q.reject(new Error('"git" command line tool is not installed: make sure it is accessible on your PATH.'));
        }
        var tmp_dir = path.join(os.tmpdir(), 'plugman-tmp' +(new Date).valueOf());

        shell.rm('-rf', tmp_dir);

        var cmd = util.format('git clone "%s" "%s"', plugin_git_url, tmp_dir);
        require('../../plugman').emit('verbose', 'Fetching plugin via git-clone command: ' + cmd);
        var d = Q.defer();

        child_process.exec(cmd, function(err, stdout, stderr) {
            if (err) {
                d.reject(err);
            } else {
                d.resolve();
            }
        });
        return d.promise.then(function() {
            require('../../plugman').emit('verbose', 'Plugin "' + plugin_git_url + '" fetched.');
            // Check out the specified revision, if provided.
            if (git_ref) {
                var cmd = util.format('git checkout "%s"', git_ref);
                var d2 = Q.defer();
                child_process.exec(cmd, { cwd: tmp_dir }, function(err, stdout, stderr) {
                    if (err) d2.reject(err);
                    else d2.resolve();
                });
                return d2.promise.then(function() {
                    require('../../plugman').emit('log', 'Plugin "' + plugin_git_url + '" checked out to git ref "' + git_ref + '".');
                });
            }
        }).then(function() {
            // Read the plugin.xml file and extract the plugin's ID.
            tmp_dir = path.join(tmp_dir, subdir);
            // TODO: what if plugin.xml does not exist?
            var xml_file = path.join(tmp_dir, 'plugin.xml');
            var xml = xml_helpers.parseElementtreeSync(xml_file);
            var plugin_id = xml.getroot().attrib.id;

            // TODO: what if a plugin dependended on different subdirectories of the same plugin? this would fail.
            // should probably copy over entire plugin git repo contents into plugins_dir and handle subdir seperately during install.
            var plugin_dir = path.join(plugins_dir, plugin_id);
            require('../../plugman').emit('verbose', 'Copying fetched plugin over "' + plugin_dir + '"...');
            shell.cp('-R', path.join(tmp_dir, '*'), plugin_dir);

            require('../../plugman').emit('verbose', 'Plugin "' + plugin_id + '" fetched.');
            return plugin_dir;
        });
    },

    // List the directories in the path, ignoring any files, .svn, etc.
    findPlugins:function(plugins_dir) {
        var plugins = [],
            stats;

        if (fs.existsSync(plugins_dir)) {
            plugins = fs.readdirSync(plugins_dir).filter(function (fileName) {
               stats = fs.statSync(path.join(plugins_dir, fileName));
               return fileName != '.svn' && fileName != 'CVS' && stats.isDirectory();
            });
        }

        return plugins;
    }
};

