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
  , plist = require('plist')
  , xcode = require('xcode')
  , osenv = require('osenv')
  , shell = require('shelljs')
  , et = require('elementtree')
  , ios = require(path.join(__dirname, '..', 'platforms', 'ios'))

  , test_dir = path.join(osenv.tmpdir(), 'test_plugman')
  , test_project_dir = path.join(test_dir, 'projects', 'ios')
  , test_plugin_dir = path.join(test_dir, 'plugins', 'ChildBrowser')
  , xml_path     = path.join(test_dir, 'plugins', 'ChildBrowser', 'plugin.xml')
  , xml_text, plugin_et

  //, assetsDir = path.resolve(config.projectPath, 'www')
  , srcDir = path.resolve(test_project_dir, 'SampleApp/Plugins')
  , resDir = path.resolve(test_project_dir, 'SampleApp/Resources');

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
    var dummy_plugin_et  = new et.ElementTree(et.XML(fs.readFileSync(dummy_xml_path, 'utf-8')));

    ios.handlePlugin('install', test_project_dir, dummy_plugin_dir, dummy_plugin_et);

    test.done();
}

exports['should move the js file'] = function (test) {
    // run the platform-specific function
    ios.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);

    var jsPath = path.join(test_dir, 'projects', 'ios', 'www', 'childbrowser.js');
    test.ok(fs.existsSync(jsPath));
    test.done();
}

exports['should move the source files'] = function (test) {
    // run the platform-specific function
    ios.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);

    test.ok(fs.existsSync(srcDir + '/ChildBrowserCommand.m'))
    test.ok(fs.existsSync(srcDir + '/ChildBrowserViewController.m'))
    test.ok(fs.existsSync(srcDir + '/preserveDirs/PreserveDirsTest.m'))
    test.ok(fs.existsSync(srcDir + '/targetDir/TargetDirTest.m'))
    test.done();
}

exports['should move the header files'] = function (test) {
    // run the platform-specific function
    ios.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);

    test.ok(fs.statSync(srcDir + '/ChildBrowserCommand.h'));
    test.ok(fs.statSync(srcDir + '/ChildBrowserViewController.h'));
    test.ok(fs.statSync(srcDir + '/preserveDirs/PreserveDirsTest.h'));
    test.ok(fs.statSync(srcDir + '/targetDir/TargetDirTest.h'));
    test.done();
}

exports['should move the xib file'] = function (test) {
    // run the platform-specific function
    ios.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);

    test.ok(fs.statSync(resDir + '/ChildBrowserViewController.xib'));
    test.done();
}

exports['should move the bundle'] = function (test) {
    // run the platform-specific function
    ios.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);

    var bundle = fs.statSync(resDir + '/ChildBrowser.bundle');

    test.ok(bundle.isDirectory());
    test.done();
}


exports['should edit PhoneGap.plist'] = function (test) {
    // run the platform-specific function
    ios.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);

    var plistPath = test_project_dir + '/SampleApp/PhoneGap.plist';
    var obj = plist.parseFileSync(plistPath);

    test.equal(obj.Plugins['com.phonegap.plugins.childbrowser'],
        'ChildBrowserCommand');
        
    test.equal(obj.ExternalHosts.length, 2)    
    test.equal(obj.ExternalHosts[0], "build.phonegap.com")
    test.equal(obj.ExternalHosts[1], "s3.amazonaws.com")

    test.done();
}

exports['should edit config.xml'] = function (test) {
    // setting up WebNotification (with config.xml) 
    var dummy_plugin_dir = path.join(test_dir, 'plugins', 'WebNotifications')
    var dummy_xml_path = path.join(test_dir, 'plugins', 'WebNotifications', 'plugin.xml')
    
    // overriding some params
    var project_dir = path.join(test_dir, 'projects', 'ios-config-xml')
    var dummy_plugin_et  = new et.ElementTree(et.XML(fs.readFileSync(dummy_xml_path, 'utf-8')));

    // run the platform-specific function
    ios.handlePlugin('install', project_dir, dummy_plugin_dir, dummy_plugin_et);
    
    var configXmlPath = path.join(project_dir, 'SampleApp', 'config.xml');
    var pluginsTxt = fs.readFileSync(configXmlPath, 'utf-8'),
        pluginsDoc = new et.ElementTree(et.XML(pluginsTxt)),
        expected = 'plugins/plugin[@name="WebNotifications"]' +
                    '[@value="WebNotifications"]';

    test.ok(pluginsDoc.find(expected));
    test.equal(pluginsDoc.findall("access").length, 3, "/access");
    test.equal(pluginsDoc.findall("access")[1].attrib["origin"], "build.phonegap.com")
    test.equal(pluginsDoc.findall("access")[2].attrib["origin"], "s3.amazonaws.com")
    test.done();
}

exports['should edit config.xml even when using old <plugins-plist> approach'] = function (test) {
    // setting up PGSQLitePlugin (with config.xml) 
    var dummy_plugin_dir = path.join(test_dir, 'plugins', 'ChildBrowser')
    var dummy_xml_path = path.join(dummy_plugin_dir, 'plugin.xml')
    
    // overriding some params
    var project_dir = path.join(test_dir, 'projects', 'ios-config-xml')
    var dummy_plugin_et  = new et.ElementTree(et.XML(fs.readFileSync(dummy_xml_path, 'utf-8')));

    // run the platform-specific function
    ios.handlePlugin('install', project_dir, dummy_plugin_dir, dummy_plugin_et);
    
    var configXmlPath = path.join(project_dir, 'SampleApp', 'config.xml');
    var pluginsTxt = fs.readFileSync(configXmlPath, 'utf-8'),
        pluginsDoc = new et.ElementTree(et.XML(pluginsTxt)),
        expected = 'plugins/plugin[@name="com.phonegap.plugins.childbrowser"]' +
                    '[@value="ChildBrowserCommand"]';

    test.ok(pluginsDoc.find(expected));
    test.equal(pluginsDoc.findall("access").length, 3, "/access");
    test.equal(pluginsDoc.findall("access")[1].attrib["origin"], "build.phonegap.com")
    test.equal(pluginsDoc.findall("access")[2].attrib["origin"], "s3.amazonaws.com")

    test.done();
}

exports['should edit the pbxproj file'] = function (test) {
    // run the platform-specific function
    ios.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);

    var projPath = test_project_dir + '/SampleApp.xcodeproj/project.pbxproj';

    obj = xcode.project(projPath).parseSync();
    var fileRefSection = obj.hash.project.objects['PBXFileReference'],
        fileRefLength = Object.keys(fileRefSection).length,
        EXPECTED_TOTAL_REFERENCES = 96; // magic number ahoy!

    test.equal(fileRefLength, EXPECTED_TOTAL_REFERENCES);
    test.done();
}

exports['should add the framework references to the pbxproj file'] = function (test) {
    // run the platform-specific function
    ios.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);
    var projPath = test_project_dir + '/SampleApp.xcodeproj/project.pbxproj',
        projContents = fs.readFileSync(projPath, 'utf8'),
        projLines = projContents.split("\n"),
		weak_linked = "settings = {ATTRIBUTES = (Weak, ); };",
        references;

    references = projLines.filter(function (line) {
        return !!(line.match("libsqlite3.dylib"));
    })

    // should be four libsqlite3 reference lines added
    // pretty low-rent test eh
    test.equal(references.length, 4);
    test.ok(references[0].indexOf(weak_linked) == -1);
    test.done();
}

exports['should add the framework references with weak option to the pbxproj file'] = function (test) {
    // run the platform-specific function
    ios.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);
    var projPath = test_project_dir + '/SampleApp.xcodeproj/project.pbxproj',
        projContents = fs.readFileSync(projPath, 'utf8'),
        projLines = projContents.split("\n"),
		weak_linked = "settings = {ATTRIBUTES = (Weak, ); };",
        references;

    weak_references = projLines.filter(function (line) {
        return !!(line.match("social.framework"));
    })

    non_weak_references = projLines.filter(function (line) {
        return !!(line.match("music.framework"));
    })

    // should be four libsqlite3 reference lines added
    // pretty low-rent test eh
    test.equal(weak_references.length, 4);
    test.ok(weak_references[0].indexOf(weak_linked) != -1);
    
	test.equal(non_weak_references.length, 4);
    test.ok(non_weak_references[0].indexOf(weak_linked) == -1);
	test.done();
}

exports['should not install a plugin that is already installed'] = function (test) {
    ios.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);

    test.throws(function(){ios.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et); }, 
                /already installed/
               );
    test.done();
}
