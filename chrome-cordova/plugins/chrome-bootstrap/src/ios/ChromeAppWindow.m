// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import <Cordova/CDVPlugin.h>
#import <Foundation/Foundation.h>
#import <UIKit/UIScreen.h>

#if CHROME_APP_WINDOW_VERBOSE_LOGGING
#define VERBOSE_LOG NSLog
#else
#define VERBOSE_LOG(args...) do {} while (false)
#endif

@interface ChromeAppWindow : CDVPlugin

- (void)hide:(CDVInvokedUrlCommand*)command;
- (void)show:(CDVInvokedUrlCommand*)command;

@end

@implementation ChromeAppWindow

- (void)unsupportedApi:(CDVInvokedUrlCommand*)command name:(NSString*)name
{
    NSLog(@"AppWindow.%@ not supported on iOS", name);
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK]
                                callbackId:command.callbackId];
}

- (void)hide:(CDVInvokedUrlCommand*)command
{
    [self unsupportedApi:command name:@"hide"];
}

- (void)show:(CDVInvokedUrlCommand*)command
{
    [self unsupportedApi:command name:@"show"];
}

@end
