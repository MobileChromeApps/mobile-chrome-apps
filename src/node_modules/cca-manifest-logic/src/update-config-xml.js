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

// configXmlDom: parsed with DOMParser.
module.exports = exports = function updateConfigXml(manifest, analyzedManifest, configXmlDom) {
  var widget = configXmlDom.lastChild; // firstChild is the <xml> delcaration.
  function $(name) {
    var ret = widget.getElementsByTagName(name);
    return ret && ret[0];
  }
  function getOrCreateRootNode(name) {
    var ret = $(name);
    if (!ret) {
      ret = configXmlDom.createElement(name);
      widget.appendChild(ret);
    }
    return ret;
  }
  function setOrDeleteAttribute(node, name, value) {
    if (value) {
      node.setAttribute(name, value);
    } else {
      node.removeAttribute(name);
    }
  }

  var ver = manifest.version || '0.0.1';
  if (!/^\d+(\.\d+(\.\d+(-.*)?)?)?$/.exec(ver)) {
    throw new Error('Invalid version: "' + ver + '" Must contain at most 3 numbers separated by periods.');
  }
  // Work-around for soon-to-be-fixed bug in cordova-lib (fix is in 4.0.1-dev)
  while (ver.split('.').length < 3) {
    ver += '.0';
  }
  widget.setAttribute('version', ver);
  widget.setAttribute('id', manifest.packageId || 'com.your.company.HelloWorld');
  setOrDeleteAttribute(widget, 'android-versionCode', manifest.versionCode);
  setOrDeleteAttribute(widget, 'ios-CFBundleVersion', manifest.CFBundleVersion);

  getOrCreateRootNode('name').textContent = manifest.name || manifest.packageId || 'Your App Name';
  getOrCreateRootNode('description').textContent = manifest.description || 'Plain text description of this app';
  getOrCreateRootNode('author').textContent = manifest.author || 'Author Name <a@b.com>';
  getOrCreateRootNode('content').setAttribute('src', 'plugins/org.chromium.bootstrap/chromeapp.html');

  var access;
  while ((access = $('access'))) {
    access.parentNode.removeChild(access);
  }
  analyzedManifest.whitelist.forEach(function(pattern, index) {
    var tag = configXmlDom.createElement('access');
    tag.setAttribute('origin', pattern);
    widget.appendChild(tag);
  });
};
