// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var helpers = require('org.chromium.common.helpers');

var Event = function(opt_eventName) {
  this.name = opt_eventName || '';
  this.listeners = [];
};

// Deliberately not filtering functions that are already added.
// I tested on desktop and it will call your callback once for each addListener.
Event.prototype.addListener = function(cb) {
  this.listeners.push(cb);
};

Event.prototype.findListener_ = function(cb) {
  for(var i = 0; i < this.listeners.length; i++) {
    if (this.listeners[i] == cb) {
      return i;
    }
  }

  return -1;
};

Event.prototype.removeListener = function(cb) {
  var index = this.findListener_(cb);
  if (index >= 0) {
    this.listeners.splice(index, 1);
  }
};

Event.prototype.hasListener = function(cb) {
  return this.findListener_(cb) >= 0;
};

Event.prototype.hasListeners = function() {
  return this.listeners.length > 0;
};

Event.prototype.fire = function() {
  // For Chrome Apps: Never fire events before background page is loaded.
  // For vanilla Cordova: fire events after deviceready.
  var self = this;
  var args = Array.prototype.slice.call(arguments);
  helpers.queueLifeCycleEvent(function() {
    self._fireInternal.apply(self, args);
  });
};

// Used by fire(), will trigger events immediately, rather than queuing to
// happen after startup/initialization
Event.prototype._fireInternal = function() {
  for (var i = 0; i < this.listeners.length; i++) {
    this.listeners[i].apply(this, arguments);
  }
};

// Stubs since we don't support Rules.
Event.prototype.addRules = function() { };
Event.prototype.getRules = function() { };
Event.prototype.removeRules = function() { };

module.exports = Event;
