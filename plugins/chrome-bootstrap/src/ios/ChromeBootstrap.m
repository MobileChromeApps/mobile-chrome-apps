// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import "ChromeBootstrap.h"

#pragma mark ChromeBootstrap

@implementation ChromeBootstrap

@synthesize needsLaunch=_needsLaunch;

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];
    if (self) {
        self.needsLaunch = ([[UIApplication sharedApplication] applicationState] != UIApplicationStateBackground);
    }
    return self;
}

- (void)doesNeedLaunch:(CDVInvokedUrlCommand*)command
{
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsBool:self.needsLaunch];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

@end
