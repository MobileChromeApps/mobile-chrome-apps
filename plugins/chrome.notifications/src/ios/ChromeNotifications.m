// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import "ChromeNotifications.h"


@interface ChromeNotifications () {
    NSOperationQueue* _executor;
}
- (void)_create:(CDVInvokedUrlCommand*)command;
- (void)_update:(CDVInvokedUrlCommand*)command;
- (void)_clear:(CDVInvokedUrlCommand*)command;
- (void)onClose:(NSString*)notificationID ;

@end

@implementation ChromeNotifications

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];
    if (self) {
        _executor = [NSOperationQueue  new];
        [_executor setMaxConcurrentOperationCount:1];
    }
    return self;
}

- (void)create:(CDVInvokedUrlCommand*)command
{
    NSInvocationOperation* operation = [[NSInvocationOperation alloc] initWithTarget:self selector:@selector(_create:) object:command];
    [_executor addOperation:operation];
}

- (void)_create:(CDVInvokedUrlCommand*)command
{
    NSLog(@"Chrome.notifications.create not implemented");
    CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:@""];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}


- (void)update:(CDVInvokedUrlCommand*)command
{
    NSInvocationOperation* operation = [[NSInvocationOperation alloc] initWithTarget:self selector:@selector(_update:) object:command];
    [_executor addOperation:operation];
}

- (void)_update:(CDVInvokedUrlCommand*)command
{
    NSLog(@"Chrome.notifications.update not implemented");
    CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsBool:false];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)clear:(CDVInvokedUrlCommand*)command
{
    NSInvocationOperation* operation = [[NSInvocationOperation alloc] initWithTarget:self selector:@selector(_clear:) object:command];
    [_executor addOperation:operation];
}

- (void)_clear:(CDVInvokedUrlCommand*)command
{
    NSLog(@"Chrome.notifications.clear not implemented");
    CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsBool:false];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void) onClose:(NSString*)notificationID
{
    [self.webView stringByEvaluatingJavaScriptFromString:[NSString stringWithFormat:@"chrome.notifications.onClose.fire({notificationId:'%@', byUser:false})", notificationID]];
}

- (void) fireStartupEvents:(CDVInvokedUrlCommand*)command
{

}

@end
