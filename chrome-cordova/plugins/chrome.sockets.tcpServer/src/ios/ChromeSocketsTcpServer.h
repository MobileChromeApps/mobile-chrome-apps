// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import <Foundation/Foundation.h>
#import <Cordova/CDVPlugin.h>

@class GCDAsyncSocket;

@interface ChromeSocketsTcpServer : CDVPlugin

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView;

- (void)create:(CDVInvokedUrlCommand*)command;

- (void)update:(CDVInvokedUrlCommand*)command;

- (void)setPaused:(CDVInvokedUrlCommand*)command;

- (void)listen:(CDVInvokedUrlCommand*)command;

- (void)disconnect:(CDVInvokedUrlCommand*)command;

- (void)close:(CDVInvokedUrlCommand*)command;

- (void)getInfo:(CDVInvokedUrlCommand*)command;

- (void)getSockets:(CDVInvokedUrlCommand*)command;

- (void)registerAcceptEvents:(CDVInvokedUrlCommand*)command;

- (void)fireAcceptEventsWithSocketId:(NSUInteger)theSocketId clientSocket:(GCDAsyncSocket*)theClientSocket;

- (void)fireAcceptErrorEventsWithSocketId:(NSUInteger)theSocketId code:(NSInteger)theCode;

@end