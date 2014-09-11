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

// Common parameters.
var v = 1; // Protocol version.
var tid = 'UA-52080037-2'; // Tracking ID.
var cid = '12345'; // Client ID.  TODO(maxw): Use something relevant.
var an = 'cca'; // App name.
var av = require('../package').version; // App version.

// URL base, based on the above parameters.
var URL_BASE = 'http://www.google-analytics.com/collect?';
URL_BASE += 'v=' + v;
URL_BASE += '&tid=' + tid;
URL_BASE += '&cid=' + cid;
URL_BASE += '&an=' + an;
URL_BASE += '&av=' + av;

// This helper function sends a measurement to the given URL.
function sendMeasurement(url) {
  var http = require('http');
  http.get(url);
}

module.exports = {
  // Send an event to the analytics server.
  sendEvent: function(eventCategory, eventAction) {
    var url = URL_BASE;
    url += '&t=event';
    url += '&ec=' + eventCategory;
    url += '&ea=' + eventAction;

    sendMeasurement(url);
  }
};
