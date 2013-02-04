// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import <Foundation/Foundation.h>
#import <Cordova/CDVPlugin.h>

@interface ChromeSocket : CDVPlugin

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView;

- (void)create:(CDVInvokedUrlCommand*)command;
- (void)connect:(CDVInvokedUrlCommand*)command;
- (void)listen:(CDVInvokedUrlCommand*)command;
- (void)accept:(CDVInvokedUrlCommand*)command;
- (void)write:(CDVInvokedUrlCommand*)command;
- (void)read:(CDVInvokedUrlCommand*)command;
- (void)sendTo:(CDVInvokedUrlCommand*)command;
//- (void)recvFrom:(CDVInvokedUrlCommand*)command;
- (void)disconnect:(CDVInvokedUrlCommand*)command;
- (void)destroy:(CDVInvokedUrlCommand*)command;

@end
