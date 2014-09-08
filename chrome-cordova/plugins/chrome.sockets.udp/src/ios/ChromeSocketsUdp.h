// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import <Foundation/Foundation.h>
#import <Cordova/CDVPlugin.h>

@interface ChromeSocketsUdp : CDVPlugin

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView;

- (void)create:(CDVInvokedUrlCommand*)command;

- (void)setPaused:(CDVInvokedUrlCommand*)command;

- (void)bind:(CDVInvokedUrlCommand*)command;

- (void)send:(CDVInvokedUrlCommand*)command;

- (void)close:(CDVInvokedUrlCommand*)command;

- (void)getInfo:(CDVInvokedUrlCommand*)command;

- (void)getSockets:(CDVInvokedUrlCommand*)command;

- (void)registerReceiveEvents:(CDVInvokedUrlCommand*)command;

- (void)fireReceiveEventsWithSocketId:(NSUInteger)theSocketId data:(NSData*)theData address:(NSString*)theAddress port:(NSUInteger)thePort;
@end
