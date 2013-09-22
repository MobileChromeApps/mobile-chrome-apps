// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var Event = require('org.chromium.common.events');
exports.onLaunched = new Event('onLaunched');
exports.onRestarted = new Event('onRestarted');
