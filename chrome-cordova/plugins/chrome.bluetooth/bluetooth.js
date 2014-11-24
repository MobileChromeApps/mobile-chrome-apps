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
    exec(callback, fail(callback), 'ChromeBluetooth', 'startDiscovery', []);
};

exports.stopDiscovery = function(callback) {
    exec(callback, fail(callback), 'ChromeBluetooth', 'stopDiscovery', []);
};

exports.onAdapterStateChanged = new Event('onAdapterStateChanged');
exports.onDeviceAdded = new Event('onDeviceAdded');
exports.onDeviceChanged = new Event('onDeviceChanged');
exports.onDeviceRemoved = new Event('onDeviceRemoved');

function registerEvents() {
    var onEventsCallback = function(eventType, info) {
        switch (eventType) {
        case 'onAdapterStateChanged':
            exports.onAdapterStateChanged.fire(info);
            break;
        case 'onDeviceAdded':
            exports.onDeviceAdded.fire(info);
            break;
        case 'onDeviceChanged':
            exports.onDeviceChanged.fire(info);
            break;
        case 'onDeviceRemoved':
            exports.onDeviceRemoved.fire(info);
            break;
        }
    };
    exec(onEventsCallback, null, 'ChromeBluetooth', 'registerBluetoothEvents', []);
}

require('org.chromium.common.helpers').runAtStartUp(registerEvents);
