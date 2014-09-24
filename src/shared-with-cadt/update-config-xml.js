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

'use strict';

var et = require('elementtree');

module.exports = exports = function updateConfigXml(manifest, analyzedManifest, configXmlData) {
  var jsescape = require('jsesc');
  function escapedValueOrDefault(value, defaultValue) {
    if (typeof value === 'undefined')
      return defaultValue;
    return jsescape(value);
  }

  var tree = et.parse(configXmlData);

  var widget = tree.getroot();
  if (widget.tag == 'widget') {
    widget.attrib.version = escapedValueOrDefault(manifest.version, '0.0.1');
    widget.attrib.id = escapedValueOrDefault(manifest.packageId, 'com.your.company.HelloWorld');
    if (manifest.versionCode) {
      widget.attrib['android-versionCode'] = manifest.versionCode;
    }
    if (manifest.CFBundleVersion) {
      widget.attrib['ios-CFBundleVersion'] = manifest.CFBundleVersion;
    }
  }

  var name = tree.find('./name');
  if (name) name.text = escapedValueOrDefault(manifest.name, 'Your App Name');

  var description = tree.find('./description');
  if (description) description.text = escapedValueOrDefault(manifest.description, 'Plain text description of this app');

  var author = tree.find('./author');
  if (author) author.text = escapedValueOrDefault(manifest.author, 'Author name and email');

  var content = tree.find('./content');
  if (content) content.attrib.src = "plugins/org.chromium.bootstrap/chromeapp.html";

  var access;
  while ((access = widget.find('./access'))) {
    widget.remove(access);
  }
  analyzedManifest.whitelist.forEach(function(pattern, index) {
    var tag = et.SubElement(widget, 'access');
    tag.attrib.origin = pattern;
  });

  var newConfigFileContent = et.tostring(tree.getroot(), {indent: 4});
  return newConfigFileContent;
};
