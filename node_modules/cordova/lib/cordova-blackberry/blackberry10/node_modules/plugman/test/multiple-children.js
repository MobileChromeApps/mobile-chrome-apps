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

// Test plugin.xml with multiple child elements
var fs = require('fs')
  , path = require('path')
  , et = require('elementtree')
  , osenv = require('osenv')
  , shell = require('shelljs')
  , android = require(path.join(__dirname, '..', 'platforms', 'android'))

  , test_dir = path.join(osenv.tmpdir(), 'test_plugman')
  , test_project_dir = path.join(test_dir, 'projects', 'multiple-children')
  , test_plugin_dir = path.join(test_dir, 'plugins', 'multiple-children')
  , xml_path     = path.join(test_dir, 'plugins', 'multiple-children', 'plugin.xml')
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

exports['should install okay'] = function (test) {
    android.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);
    test.done();
}

exports['should install all the uses-permission tags'] = function (test) {
    android.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);
    var manifestPath = path.join(test_dir, 'projects', 'multiple-children', 'AndroidManifest.xml');
    var manifestTxt = fs.readFileSync(manifestPath, 'utf8'),
        mDoc = new et.ElementTree(et.XML(manifestTxt)),
        found, receive;

    found = mDoc.findall(usesPermission('READ_PHONE_STATE'))
    test.equal(found.length, 1, 'READ_PHONE_STATE permission');

    found = mDoc.findall(usesPermission('INTERNET'))
    test.equal(found.length, 1, 'INTERNET permission');

    found = mDoc.findall(usesPermission('GET_ACCOUNTS'))
    test.equal(found.length, 1, 'GET_ACCOUNTS permission');

    found = mDoc.findall(usesPermission('WAKE_LOCK'))
    test.equal(found.length, 1, 'WAKE_LOCK permission');

    receive = 'uses-permission[@android:name=' + 
        '"com.google.android.c2dm.permission.RECEIVE"]';
    found = mDoc.findall(receive)
    test.equal(found.length, 1, 'RECEVIE permission');

    test.done();
}

exports['should interpolate the $PACKAGE_NAME correctly'] = function (test) {
    android.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);
    var manifestPath = path.join(test_dir, 'projects', 'multiple-children', 'AndroidManifest.xml');
    var manifestTxt = fs.readFileSync(manifestPath, 'utf8'),
        mDoc = new et.ElementTree(et.XML(manifestTxt)),
        soughtEle;

    soughtEle = 'permission' +
        '[@android:name="com.alunny.childapp.permission.C2D_MESSAGE"]';
    test.equal(mDoc.findall(soughtEle).length, 1, soughtEle);

    soughtEle = 'uses-permission' +
        '[@android:name="com.alunny.childapp.permission.C2D_MESSAGE"]';
    test.equal(mDoc.findall(soughtEle).length, 1, soughtEle);

    /*
	<config-file target="AndroidManifest.xml" parent="/manifest/application">
		<receiver
			android:name="com.google.android.gcm.GCMBroadcastReceiver"
			android:permission="com.google.android.c2dm.permission.SEND">
			<intent-filter>
				<category android:name="$PACKAGE_NAME"/>
    */
    soughtEle = 'application/receiver/intent-filter/category' +
        '[@android:name="com.alunny.childapp"]';
    test.equal(mDoc.findall(soughtEle).length, 1, soughtEle);

    // TODO: fix bug in equalNodes
    soughtEle = 'application/activity/intent-filter/action' +
        '[@android:name="com.alunny.childapp.MESSAGE"]';
    test.equal(mDoc.findall(soughtEle).length, 1, soughtEle);

    /*
	<config-file target="AndroidManifest.xml" parent="/manifest/application/activity">
		<intent-filter>
			<action android:name="$PACKAGE_NAME.MESSAGE"/>

    */
    test.done();
}

function usesPermission(name) {
    return 'uses-permission[@android:name="android.permission.' + name + '"]';
}

