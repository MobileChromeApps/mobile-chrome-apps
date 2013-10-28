// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import "ChromePower.h"

#if CHROME_POWER_VERBOSE_LOGGING
#define VERBOSE_LOG NSLog
#else
#define VERBOSE_LOG(args...) do {} while (false)
#endif

@implementation ChromePower

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];
    return self;
}

- (void)requestKeepAwake:(CDVInvokedUrlCommand*)command
{
    // TODO(maxw): Use the level to differentiate between display-off and display-on.
    [[UIApplication sharedApplication] setIdleTimerDisabled:YES];
}

- (void)releaseKeepAwake:(CDVInvokedUrlCommand*)command
{
    [[UIApplication sharedApplication] setIdleTimerDisabled:NO];
}

@end

