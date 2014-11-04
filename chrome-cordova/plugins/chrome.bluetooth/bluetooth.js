// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var Event = require('org.chromium.common.events');
var platform = cordova.require('cordova/platform');
var exec = require('cordova/exec');
var callbackWithError = require('org.chromium.common.errors').callbackWithError;

var fail = function(callback) {
    return callback && function(msg) {
        callbackWithError(msg, callback);
    };
};

exports.getAdapterState = function(callback) {
    exec(callback, fail(callback), 'ChromeBluetooth', 'getAdapterState', []);
};

exports.getDevice = function(deviceAddress, callback) {
    exec(callback, fail(callback), 'ChromeBluetooth', 'getDevice', [deviceAddress]);
};

exports.getDevices = function(callback) {
    exec(callback, fail(callback), 'ChromeBluetooth', 'getDevices', []);
};

exports.startDiscovery = function(callback) {
    if (platform.id == 'android') {
        exec(callback, fail(callback), 'ChromeBluetooth', 'startDiscovery', []);
    } else {
        console.warn('chrome.bluetooth.startDiscovery not implemented yet');
    }
};

exports.stopDiscovery = function(callback) {
    if (platform.id == 'android') {
        exec(callback, fail(callback), 'ChromeBluetooth', 'stopDiscovery', []);
    } else {
        console.warn('chrome.bluetooth.stopDiscovery not implemented yet');
    }
};

exports.onAdapterStateChanged = new Event('onAdapterStateChanged');
exports.onDeviceAdded = new Event('onDeviceAdded');
exports.onDeviceChanged = new Event('onDeviceChanged');
exports.onDeviceRemoved = new Event('onDeviceRemoved');

function registerEvents() {
    var onAdapterStateChangedCallback = function(adapterState) {
        exports.onAdapterStateChanged.fire(adapterState);
    };
    exec(onAdapterStateChangedCallback, null, 'ChromeBluetooth', 'registerAdapterStateChangedEvent', []);

    var onDeviceAddedCallback = function(deviceInfo) {
        exports.onDeviceAdded.fire(deviceInfo);
    };
    exec(onDeviceAddedCallback, null, 'ChromeBluetooth', 'registerDeviceAddedEvent', []);

    var onDeviceChangedCallback = function(deviceInfo) {
        exports.onDeviceChanged.fire(deviceInfo);
    };
    exec(onDeviceChangedCallback, null, 'ChromeBluetooth', 'registerDeviceChangedEvent', []);

    var onDeviceRemovedCallback = function(deviceInfo) {
        exports.onDeviceRemoved.fire(deviceInfo);
    };
    exec(onDeviceRemovedCallback, null, 'ChromeBluetooth', 'registerDeviceRemovedEvent', []);
}

require('org.chromium.common.helpers').runAtStartUp(registerEvents);
