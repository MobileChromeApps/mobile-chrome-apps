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

var fs = require('fs')
  , path = require('path')
  , shell = require('shelljs')
  , et = require('elementtree')
  , osenv = require('osenv')
  , bb10 = require(path.join(__dirname, '..', 'platforms', 'bb10'))
  , test_dir = path.join(osenv.tmpdir(), 'test_plugman')
  , test_project_dir = path.join(test_dir, 'projects', 'BlackBerry10', 'www')
  , test_plugin_dir = path.join(test_dir, 'plugins', 'cordova.echo')
  , xml_path     = path.join(test_dir, 'plugins', 'cordova.echo', 'plugin.xml')
  , xml_text, plugin_et
  , srcDir = path.resolve(test_project_dir, 'ext-qnx/cordova.echo');
  
exports.setUp = function(callback) {
    shell.mkdir('-p', test_dir);
    
    // copy the bb10 test project to a temp directory
    shell.cp('-r', path.join(__dirname, 'projects'), test_dir);

    // copy the bb10 test plugin to a temp directory
    shell.cp('-r', path.join(__dirname, 'plugins'), test_dir);

    // parse the plugin.xml into an elementtree object
    xml_text   = fs.readFileSync(xml_path, 'utf-8')
    plugin_et  = new et.ElementTree(et.XML(xml_text));

    callback();
}

exports.tearDown = function(callback) {
    // remove the temp files (projects and plugins)
    shell.rm('-rf', test_dir);
    callback();
}

exports['should remove cordova echo plugin'] = function (test) {
    // run the platform-specific function
    bb10.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);
    bb10.handlePlugin('uninstall', test_project_dir, test_plugin_dir, plugin_et);

    test.done();
}


exports['should remove the js file'] = function (test) {

    var dummy_plugin_dir = path.join(test_dir, 'plugins', 'DummyPlugin')
    var dummy_xml_path = path.join(test_dir, 'plugins', 'DummyPlugin', 'plugin.xml')
    var dummy_plugin_et  = new et.ElementTree(et.XML(fs.readFileSync(dummy_xml_path, 'utf-8')));

    bb10.handlePlugin('install', test_project_dir, dummy_plugin_dir, dummy_plugin_et);
    bb10.handlePlugin('uninstall', test_project_dir, dummy_plugin_dir, dummy_plugin_et);
    var jsPath = path.join(test_dir, 'projects', 'bb10', 'www', 'dummyplugin.js');
    test.ok(!fs.existsSync(jsPath))
    test.done();
}


exports['should remove the source files'] = function (test) {
    // run the platform-specific function
    bb10.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);
    bb10.handlePlugin('uninstall', test_project_dir, test_plugin_dir, plugin_et);

    test.ok(!fs.existsSync(srcDir + '/index.js'))
    test.ok(!fs.existsSync(srcDir + '/client.js'))
    test.ok(!fs.existsSync(srcDir + '/manifest.json'))
    test.ok(!fs.existsSync(srcDir + '/device/echoJnext.so'))
    test.ok(!fs.existsSync(srcDir + '/simulator/echoJnext.so'))
    test.done();
}

exports['should edit config.xml'] = function (test) {   
    // run the platform-specific function
    bb10.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);
    
    bb10.handlePlugin('uninstall', test_project_dir, test_plugin_dir, plugin_et);
    
    var configXmlPath = path.join(test_project_dir, 'config.xml');
    var pluginsTxt = fs.readFileSync(configXmlPath, 'utf-8'),
        pluginsDoc = new et.ElementTree(et.XML(pluginsTxt)),
        expected = 'feature[@id="cordova.echo"]';
    test.ok(!pluginsDoc.find(expected));
    
    test.done();
}

exports['should not uninstall a plugin that is not installed'] = function (test) {
    test.throws(function(){bb10.handlePlugin('uninstall', test_project_dir, test_plugin_dir, plugin_et); }, 
                /not installed/
               );
    test.done();
}
