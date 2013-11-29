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

// Test installation on Cordova 1.x project

var fs = require('fs')
  , path = require('path')
  , plist = require('plist')
  , xcode = require('xcode')
  , osenv = require('osenv')
  , shell = require('shelljs')
  , et = require('elementtree')
  , android = require(path.join(__dirname, '..', 'platforms', 'android'))

  , test_dir = path.join(osenv.tmpdir(), 'test_plugman')
  , test_project_dir = path.join(test_dir, 'projects', 'android_one')
  , test_plugin_dir = path.join(test_dir, 'plugins', 'ChildBrowser')
  , xml_path     = path.join(test_dir, 'plugins', 'ChildBrowser', 'plugin.xml')
  , xml_text, plugin_et;


exports.setUp = function(callback) {
    shell.mkdir('-p', test_dir);
    
    // copy the ios test project to a temp directory
    shell.cp('-r', path.join(__dirname, 'projects'), test_dir);

    // copy the ios test plugin to a temp directory
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

exports['should install webless plugin'] = function (test) {
    
    // setting up a DummyPlugin
    var dummy_plugin_dir = path.join(test_dir, 'plugins', 'WeblessPlugin')
    var dummy_xml_path = path.join(test_dir, 'plugins', 'WeblessPlugin', 'plugin.xml')
    dummy_plugin_et  = new et.ElementTree(et.XML(fs.readFileSync(dummy_xml_path, 'utf-8')));

    android.handlePlugin('install', test_project_dir, dummy_plugin_dir, dummy_plugin_et);

    test.done();
}

exports['should move the js file'] = function (test) {
    var jsPath = path.join(test_dir, 'projects', 'android_one', 'assets', 'www', 'childbrowser.js');
    android.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);
    fs.stat(jsPath, function(err, stats) {
        test.ok(!err);
        test.ok(stats.isFile());
        test.done();
    });
}

exports['should move the directory'] = function (test) {
    android.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);

    var assetPath = path.join(test_dir, 'projects', 'android_one', 'assets', 'www', 'childbrowser');

    var assets = fs.statSync(assetPath);

    test.ok(assets.isDirectory());
    test.ok(fs.statSync(assetPath + '/image.jpg'))
    test.done();
}

exports['should move the src file'] = function (test) {
    android.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);

    var javaPath = path.join(test_dir, 'projects', 'android_one', 'src', 'com', 'phonegap', 'plugins', 'childBrowser', 'ChildBrowser.java');
    test.ok(fs.statSync(javaPath));
    test.done();
}

exports['should add ChildBrowser to plugins.xml'] = function (test) {
    android.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);

    var pluginsXmlPath = path.join(test_dir, 'projects', 'android_one', 'res', 'xml', 'plugins.xml');
    var pluginsTxt = fs.readFileSync(pluginsXmlPath, 'utf-8'),
        pluginsDoc = new et.ElementTree(et.XML(pluginsTxt)),
        expected = 'plugin[@name="ChildBrowser"]' +
                    '[@value="com.phonegap.plugins.childBrowser.ChildBrowser"]';

    test.ok(pluginsDoc.find(expected));
    test.done();
}

exports['should add ChildBrowser to AndroidManifest.xml'] = function (test) {
    android.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);

    var manifestPath = path.join(test_dir, 'projects', 'android_one', 'AndroidManifest.xml');
    var manifestTxt = fs.readFileSync(manifestPath, 'utf-8'),
        manifestDoc = new et.ElementTree(et.XML(manifestTxt)),
        activities = manifestDoc.findall('application/activity'), i;

    var found = false;
    for (i=0; i<activities.length; i++) {
        if ( activities[i].attrib['android:name'] === 'com.phonegap.plugins.childBrowser.ChildBrowser' ) {
            found = true;
            break;
        }
    }
    test.ok(found);
    test.done();
}

exports['should add whitelist hosts'] = function (test) {
	android.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);

    var pluginsXmlPath = path.join(test_dir, 'projects', 'android_one', 'res', 'xml', 'plugins.xml');
    var pluginsTxt = fs.readFileSync(pluginsXmlPath, 'utf-8'),
        pluginsDoc = new et.ElementTree(et.XML(pluginsTxt));

    test.equal(pluginsDoc.findall("access").length, 2, "/access");
	test.equal(pluginsDoc.findall("access")[0].attrib["origin"], "build.phonegap.com")
    test.equal(pluginsDoc.findall("access")[1].attrib["origin"], "s3.amazonaws.com")
    test.done();
}
