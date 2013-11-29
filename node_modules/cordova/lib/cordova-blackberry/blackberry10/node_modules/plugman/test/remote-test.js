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

var path = require('path'),
    plugins = require(path.join(__dirname, '..', 'util', 'plugins'));

exports['should get plugin information from a remote source'] = function(test) {
    plugins.getPluginInfo('ChildBrowser', function(plugin) {
        test.equal('https://github.com/imhotep/ChildBrowser', plugin.url);
        test.equal('ChildBrowser', plugin.name);
        test.equal('ChildBrowser plugin', plugin.description);
        test.done();
    }, function() { test.ok(false); });
}

exports['should list all plugins from a remote source'] = function(test) {
    plugins.listAllPlugins(function(plugins) {
        test.ok(plugins != undefined);
        test.ok(plugins.length > 0);
        test.done();
    }, function() { test.ok(false); });
}

exports['should clone plugin git repository'] = function(test) {
    plugins.getPluginInfo('ChildBrowser', function(plugin) {
        test.ok(plugins.clonePluginGitRepo(plugin.url) != undefined);
        test.done();
    }, function() { test.ok(false); });
}
