// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import <Cordova/CDVPlugin.h>

@interface ChromeBootstrap : CDVPlugin {}

- (void)doesNeedLaunch:(CDVInvokedUrlCommand*)command;

@property(nonatomic) BOOL needsLaunch;

@end
