// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import <Cordova/CDVPlugin.h>
#import <Cordova/CDVViewController.h>
#import "CCAOpenInChromeController.h"

@interface ChromeNavigation : CDVPlugin {
    NSURLRequest* _chromeAppRequest;
    NSTimer* _pageRefreshTimer;
}
@end

static NSString *stripFragment(NSString* url)
{
    NSRange r = [url rangeOfString:@"#"];
    if (r.location == NSNotFound) {
        return url;
    }
    return [url substringToIndex:r.location];
}

@implementation ChromeNavigation

// Taken from CDVWebViewDelegate.
- (BOOL)request:(NSURLRequest*)newRequest isFragmentIdentifierToRequest:(NSURLRequest*)originalRequest
{
    if (originalRequest.URL && newRequest.URL) {
        NSString* originalRequestUrl = [originalRequest.URL absoluteString];
        NSString* newRequestUrl = [newRequest.URL absoluteString];

        NSString* baseOriginalRequestUrl = stripFragment(originalRequestUrl);
        NSString* baseNewRequestUrl = stripFragment(newRequestUrl);
        return [baseOriginalRequestUrl isEqualToString:baseNewRequestUrl];
    }
    return NO;
}

- (void)doReload {
    NSLog(@"location.reload() detected. Reloading via chromeapp.html");
    // TODO - should we preserve hash or URL?
    [self.webView loadRequest:_chromeAppRequest];
}

- (void)stopTimer {
    [_pageRefreshTimer invalidate];
    _pageRefreshTimer = nil;
}

- (void)checkForDevToolsRefresh {
    NSString* gotToken = [self.webView stringByEvaluatingJavaScriptFromString:@"window.__ChromeNavigationLoadToken"];
    NSLog(@"Got token %@", gotToken);
    if (gotToken.length == 0) {
        [self stopTimer];
        [self doReload];
    }
}

- (BOOL)shouldOverrideLoadWithRequest:(NSURLRequest*)request navigationType:(UIWebViewNavigationType)navigationType
{
    NSURL* url = request.URL;
    // Save the first URL to use it when reloading.
    if (_chromeAppRequest == nil) {
        _chromeAppRequest = [request copy];
    }

    // Ignore sub-frame navigations.
    BOOL isTopLevelNavigation = [request.URL isEqual:[request mainDocumentURL]];
    if (isTopLevelNavigation) {
        [self stopTimer];
    } else {
        if ([url.scheme isEqualToString:@"chrome-extension"]) {
            // A Command-R in DevTools sets the mainDocumentURL as if it were a sub-resource load (ugh).
            // Poll for 1 second for a JS context reset to detect this case.
            if (_pageRefreshTimer == nil) {
                [self.webView stringByEvaluatingJavaScriptFromString:@"__ChromeNavigationLoadToken=1"];
                _pageRefreshTimer = [NSTimer scheduledTimerWithTimeInterval:.1
                                                                     target:self
                                                                   selector:@selector(checkForDevToolsRefresh)
                                                                   userInfo:nil
                                                                    repeats:YES];
                [self performSelector:@selector(stopTimer) withObject:nil afterDelay:1.0];
            }
        }
        return NO;
    }

    // Detect hash changes.
    if ([self request:request isFragmentIdentifierToRequest:self.webView.request]) {
        NSString* prevURL = [self.webView stringByEvaluatingJavaScriptFromString:@"location.href"];

        if ([prevURL isEqualToString:[url absoluteString]]) {
            // This will detect location.reload() or location = location, but not DevTools Command-R.
            if ([url.scheme isEqualToString:@"chrome-extension"]) {
                [self performSelector:@selector(doReload) withObject:nil afterDelay:0.0];
                return YES;
            }
        }
        return NO;
    }

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
    return NO;
}

@end

