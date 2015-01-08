// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerManualTests('chrome.bluetooth', function(rootEl, addButton) {
  addButton('Test getAdapter State', function() {
    chrome.bluetooth.getAdapterState(function(adapter) {
      logger(JSON.stringify(adapter));
    });
  });

  addButton('Add Events Listener', function() {
    chrome.bluetooth.onAdapterStateChanged.addListener(function(adapter) {
      logger(JSON.stringify(adapter));
    });
    chrome.bluetooth.onDeviceAdded.addListener(function(device) {
      logger('Device added:');
      logger(JSON.stringify(device));
    });
    chrome.bluetooth.onDeviceChanged.addListener(function(device) {
      logger('Device changed:');
      logger(JSON.stringify(device));
    });
    chrome.bluetooth.onDeviceRemoved.addListener(function(device) {
      logger('Device removed:');
      logger(JSON.stringify(device));
    });
  });

  addButton('Start discovering', function() {
    chrome.bluetooth.startDiscovery(function() {
      logger('start discovery');
    });
  });

  addButton('Stop discovering', function() {
    chrome.bluetooth.stopDiscovery(function() {
      logger('stop discovery');
    });
  });

  addButton('Listing known devices', function() {
    chrome.bluetooth.getDevices(function(devices) {
      for (var i = 0; i < devices.length; i++) {
        logger(JSON.stringify(devices[i]));
      }
    });
  });

  addButton('Get device Info with unknown address', function() {
    chrome.bluetooth.getDevice('64:A3:CB:3A:87:65', function(device) {
      logger(JSON.stringify(device));
    });
  });

});
