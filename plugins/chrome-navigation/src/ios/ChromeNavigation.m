// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import "ChromeNavigation.h"

#import <Cordova/CDVViewController.h>

#import "CCAOpenInChromeController.h"

#pragma mark ChromeNavigation

@implementation ChromeNavigation

- (BOOL)shouldOverrideLoadWithRequest:(NSURLRequest*)request navigationType:(UIWebViewNavigationType)navigationType
{
    NSURL* url = request.URL;
    if (navigationType == UIWebViewNavigationTypeLinkClicked) {
        NSLog(@"Opening link in external browser: %@", url);
        CCAOpenInChromeController *openInController_ = [[CCAOpenInChromeController alloc] init];
        if ([openInController_ isChromeInstalled]) {
            [openInController_ openInChrome:url];
        } else {
            [[UIApplication sharedApplication] openURL:url];
        }
        return YES;
    }
    if ([url.scheme isEqualToString:@"chrome-extension"]) {
        NSLog(@"location.reload() detected. Reloading via chromeapp.html");
        [self.commandDelegate evalJs:@"chrome.runtime.reload()"];
        return YES;
    }
    return NO;
}

@end
