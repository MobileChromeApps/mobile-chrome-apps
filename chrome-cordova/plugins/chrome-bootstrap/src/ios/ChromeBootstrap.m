// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import <Cordova/CDVPlugin.h>

@interface ChromeBootstrap : CDVPlugin {
    BOOL _needsLaunch;
}
@end

@implementation ChromeBootstrap

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];
    if (self) {
        _needsLaunch = ([[UIApplication sharedApplication] applicationState] != UIApplicationStateBackground);
    }
    return self;
}

- (void)doesNeedLaunch:(CDVInvokedUrlCommand*)command
{
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsBool:_needsLaunch];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

@end
