// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var exports = module.exports;
var alarms = {};

function Alarm(name, scheduledTime, periodInMinutes, timeoutId) {
    this.name = name;
    this.scheduledTime = scheduledTime;
    if (periodInMinutes) {
        this.periodInMinutes = periodInMinutes;
    }
    this.timeoutId = timeoutId;
}

function triggerAlarm(name) {
    if (!(name in alarms)) {
        return;
    }
    exports.onAlarm.fire(alarms[name]);
    if (alarms[name].periodInMinutes) {
        alarms[name].scheduledTime += alarms[name].periodInMinutes*60000;
        alarms[name].timeoutId = setTimeout(function() { triggerAlarm(name) }, alarms[name].scheduledTime - Date.now());
    } else {
        delete alarms[name];
    }
}

exports.create = function(name, alarmInfo) {
    if (typeof alarmInfo == 'undefined') {
        alarmInfo = name;
        name = '';
    }
    if (name in alarms) {
        exports.clear(name);
    }
    var when;
    if ('when' in alarmInfo) {
        when = alarmInfo.when;
        if ('delayInMinutes' in alarmInfo) {
            throw 'Error during alarms.create: Cannot set both when and delayInMinutes.';
        }
    } else if ('delayInMinutes' in alarmInfo) {
        when = Date.now() + alarmInfo.delayInMinutes*60000;
    } else if ('periodInMinutes' in alarmInfo) {
        when = Date.now() + alarmInfo.periodInMinutes*60000;
    } else {
        throw 'Error during alarms.create: Must set at least one of when, delayInMinutes, or periodInMinutes';
    }
    var periodInMinutes = alarmInfo.periodInMinutes || null;

    var timeoutId = setTimeout(function() { triggerAlarm(name) }, when - Date.now());
    alarms[name] = new Alarm(name, when, periodInMinutes, timeoutId);
}

exports.get = function(name, callback) {
    if (typeof callback == 'undefined') {
        callback = name;
        name = '';
    }
    if (!(name in alarms)) {
        throw 'Error during alarms.get: No alarm named \'' + name + '\' exists.';
    }
    setTimeout(function() {
        callback(alarms[name])
    }, 0);
}

exports.getAll = function(callback) {
    var ret = [];
    for (var name in alarms) {
        ret.push(alarms[name]);
    }
    setTimeout(function() {
       callback(ret);
    }, 0);
}

exports.clear = function clear(name) {
    if (typeof name == 'undefined') {
        name = '';
    }
    if (!(name in alarms)) {
        throw 'Error during alarms.clear: No alarm named \'' + name + '\' exists.';
    }
    clearTimeout(alarms[name].timeoutId);
    delete alarms[name];
}

exports.clearAll = function() {
    Object.keys(alarms).forEach(function(name) {
        exports.clear(name);
    });
}

var Event = require('org.chromium.chrome-common.events');
if (Event) {
    exports.onAlarm = new Event('onAlarm');
}
