/**
  Licensed to the Apache Software Foundation (ASF) under one
  or more contributor license agreements.  See the NOTICE file
  distributed with this work for additional information
  regarding copyright ownership.  The ASF licenses this file
  to you under the Apache License, Version 2.0 (the
  "License"); you may not use this file except in compliance
  with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing,
  software distributed under the License is distributed on an
  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  KIND, either express or implied.  See the License for the
  specific language governing permissions and limitations
  under the License.
 */

if (typeof WScript != 'undefined') {
  var shell = WScript.CreateObject("WScript.Shell");
  try {
    var ret = shell.Run('cmd /c node "' + WScript.ScriptFullName + '" --pause_on_exit', 1, true);
  } catch (e) {
    shell.Popup('NodeJS is not installed. Please install it from http://nodejs.org');
    ret = 1;
  }
  WScript.Quit(ret);
}

var common = require('./common');
process.on('uncaughtException', function(e) {
  common.fatal('Uncaught exception: ' + e);
});

var fs = require('fs');
var path = require('path');

var origDir = process.cwd();
var isWindows = process.platform.slice(0, 3) == 'win';
var hasAndroid = fs.existsSync(path.join('platforms', 'android'));
var hasIos = fs.existsSync(path.join('platforms', 'ios'));

if (!fs.existsSync('platforms')) {
  common.fatal('No platforms directory found. Please run script from the root of your project.');
}

function runPrepare(callback) {
  console.log(process.cwd())
  common.exec(common.cordovaCmd(['prepare']), callback);
}

function createAddJsStep(platform) {
  return function(callback) {
    console.log('Updating cordova.js for ' + platform);
    common.copyFile(path.join(common.scriptDir, 'cordova-js', 'pkg', 'cordova.' + platform + '.js'), path.join('platforms', platform, 'www', 'cordova.js'), callback);
  };
}

function createAddAccessTagStep(platform) {
  return function(callback) {
    console.log('Setting <access> tag for ' + platform);
    var appName = path.basename(origDir);
    var configFilePath = platform == 'android' ?
        path.join('platforms', 'android', 'res', 'xml', 'config.xml') :
        path.join('platforms', 'ios', appName, 'config.xml');
    if (!fs.existsSync(configFilePath)) {
      common.fatal('Expected file to exist: ' + configFilePath);
    }
    var contents = fs.readFileSync(configFilePath);
    //contents = contents.replace();
//\ \ \ \ <access origin="chrome-extension://*" />
    fs.writeFileSync(configFilePath);
    callback();
  };
};


var eventQueue = common.eventQueue;
eventQueue.push(runPrepare);
if (hasAndroid) {
  eventQueue.push(createAddJsStep('android'));
  eventQueue.push(createAddAccessTagStep('android'));
}
if (hasIos) {
  eventQueue.push(createAddJsStep('ios'));
  eventQueue.push(createAddAccessTagStep('ios'));
}

common.pump();
