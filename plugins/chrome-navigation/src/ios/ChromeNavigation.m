// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import "ChromeNavigation.h"

#import <Cordova/CDVViewController.h>

#import "OpenInChromeController.h"

#pragma mark ChromeNavigation

@implementation ChromeNavigation

- (BOOL)shouldOverrideLoadWithRequest:(NSURLRequest*)request navigationType:(UIWebViewNavigationType)navigationType
{
    if(navigationType == UIWebViewNavigationTypeLinkClicked) {
        OpenInChromeController *openInController_ = [[OpenInChromeController alloc] init];
        if ([openInController_ isChromeInstalled]) {
            [openInController_ openInChrome:[request URL] ];
        } else {
            [[UIApplication sharedApplication] openURL:[request URL]];
        }
        return YES;
    }
    return NO;
}

@end
