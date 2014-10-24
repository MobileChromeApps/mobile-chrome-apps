// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import <Foundation/Foundation.h>
#import <Cordova/CDVPlugin.h>

@class GCDAsyncSocket;

@interface ChromeSocketsTcp : CDVPlugin

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView;

- (void)create:(CDVInvokedUrlCommand*)command;

- (void)update:(CDVInvokedUrlCommand*)command;

- (void)setPaused:(CDVInvokedUrlCommand*)command;

// - (void)setKeepAlive:(CDVInvokedUrlCommand*)command;
// - (void)setNoDelay:(CDVInvokedUrlCommand*)command;

- (void)connect:(CDVInvokedUrlCommand*)command;

- (void)disconnect:(CDVInvokedUrlCommand*)command;

- (void)secure:(CDVInvokedUrlCommand*)command;

- (void)send:(CDVInvokedUrlCommand*)command;

- (void)close:(CDVInvokedUrlCommand*)command;

- (void)getInfo:(CDVInvokedUrlCommand*)command;

- (void)getSockets:(CDVInvokedUrlCommand*)command;

- (void)registerReceiveEvents:(CDVInvokedUrlCommand*)command;

- (void)fireReceiveEventsWithSocketId:(NSUInteger)theSocketId data:(NSData*)theData;

- (void)fireReceiveErrorEventsWithSocketId:(NSUInteger)theSocketId error:(NSError*)theError;

- (NSUInteger)registerAcceptedSocket:(GCDAsyncSocket*)theSocket;

@end