// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import "ChromeI18n.h"

#if CHROME_I18N_VERBOSE_LOGGING
#define VERBOSE_LOG NSLog
#else
#define VERBOSE_LOG(args...) do {} while (false)
#endif


@implementation ChromeI18n

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];
    return self;
}

- (void)getAcceptLanguages:(CDVInvokedUrlCommand*)command
{
    CDVPluginResult* pluginResult = nil;
    @try {
        NSMutableArray* ret = [NSMutableArray array];
        NSLocale *locale = [NSLocale currentLocale];
        NSString* curr = [locale localeIdentifier];
        curr = [curr stringByReplacingOccurrencesOfString:@"_" withString:@"-"];
        [ret addObject:curr];
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:ret];
    } @catch (NSException *exception) {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Could not retrieve supported locales"];
        VERBOSE_LOG(@"Could not retrieve supported locales - %@", exception);
    } @finally {
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
}

@end
