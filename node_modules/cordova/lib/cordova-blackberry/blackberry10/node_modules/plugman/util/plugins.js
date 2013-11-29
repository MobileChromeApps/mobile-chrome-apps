#!/usr/bin/env node
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
    osenv = require('osenv'),
    path = require('path'),
    fs = require('fs'),
    util = require('util'),
    shell = require('shelljs'),
    remote = require(path.join(__dirname, '..', 'config', 'remote'));

// Fetches plugin information from remote server
exports.getPluginInfo = function(plugin_name, success, error) {
    http.get(remote.url + util.format(remote.query_path, plugin_name), function(res) {
      var str = '';
      res.on('data', function (chunk) {
        str += chunk;
      });
      res.on('end', function () {
          var response, plugin_info;
          if((response = JSON.parse(str)).rows.length == 1) {
            plugin_info = response.rows[0].value;
            success(plugin_info);
          } else {
            error("Could not find information on "+plugin_dir+" plugin");
          }
      });
      
    }).on('error', function(e) {
      console.log("Got error: " + e.message);
      error(e.message);
    });
}

exports.listAllPlugins = function(success, error) {
    http.get(remote.url + remote.list_path, function(res) {
      var str = '';
      res.on('data', function (chunk) {
        str += chunk;
      });
      res.on('end', function () {
          var plugins = (JSON.parse(str)).rows;
          success(plugins);
      });
      
    }).on('error', function(e) {
      console.log("Got error: " + e.message);
      error(e.message);
    });
}

exports.clonePluginGitRepo = function(plugin_git_url) {
    if(!shell.which('git')) {
        throw new Error('git command line is not installed');
    }
    // use osenv to get a temp directory in a portable way
    plugin_dir = path.join(osenv.tmpdir(), 'plugin');
    
    // trash it if it already exists (something went wrong before probably)
    if(fs.existsSync(plugin_dir)) {
        shell.rm('-rf', plugin_dir);
    }

    if(shell.exec('git clone ' + plugin_git_url + ' ' + plugin_dir + ' 2>&1 1>/dev/null', {silent: true}).code != 0) {
        throw new Error('failed to get the plugin via git URL '+ plugin_git_url);
    }
    
    process.on('exit', function() {
        console.log('cleaning up...');
        // clean up
        if(fs.existsSync(plugin_dir)) {
            shell.rm('-rf', plugin_dir);
        }
    });

    return plugin_dir;
}

// TODO add method for archives and other formats
// exports.extractArchive = function(plugin_dir) {
// }

// TODO add method to publish plugin from cli 
// exports.publishPlugin = function(plugin_dir) {
// }

// TODO add method to unpublish plugin from cli 
// exports.unpublishPlugin = function(plugin_dir) {
// }
