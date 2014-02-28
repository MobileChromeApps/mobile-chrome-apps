// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import <Foundation/Foundation.h>
#import <Cordova/CDVPlugin.h>

@interface ChromeNotifications : CDVPlugin

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView;

- (void)create:(CDVInvokedUrlCommand*)command;
- (void)update:(CDVInvokedUrlCommand*)command;
- (void)clear:(CDVInvokedUrlCommand*)command;
- (void)fireStartupEvents:(CDVInvokedUrlCommand*)command;

@end
