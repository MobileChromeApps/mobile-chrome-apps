// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import <GoogleOpenSource/GoogleOpenSource.h>
#import <GooglePlus/GooglePlus.h>
#import "ChromeIdentity.h"

#if CHROME_IDENTITY_VERBOSE_LOGGING
#define VERBOSE_LOG NSLog
#else
#define VERBOSE_LOG(args...) do {} while (false)
#endif

@implementation ChromeIdentity

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];

    GPPSignIn *signIn = [GPPSignIn sharedInstance];
    [signIn setShouldFetchGooglePlusUser:YES];
    [signIn setDelegate:self];

    return self;
}

- (void)getAuthToken:(CDVInvokedUrlCommand*)command
{
    // Save the callback id for later.
    [self setCallbackId:[command callbackId]];

    // Extract the OAuth2 data.
    GPPSignIn *signIn = [GPPSignIn sharedInstance];
    NSDictionary *oauthData = [command argumentAtIndex:1];
    [signIn setClientID:[oauthData objectForKey:@"client_id"]];
    [signIn setScopes:[oauthData objectForKey:@"scopes"]];

    // Authenticate!
    [signIn authenticate];
}

- (void)removeCachedAuthToken:(CDVInvokedUrlCommand*)command
{
    NSString *token = [command argumentAtIndex:0];
    GTMOAuth2Authentication *authentication = [[GPPSignIn sharedInstance] authentication];

    // If the token to revoke is the same as the one we have cached, trigger a refresh.
    if ([[authentication accessToken] isEqualToString:token]) {
        [authentication setAccessToken:nil];
        [authentication authorizeRequest:nil completionHandler:nil];
    }

    // Call the callback.
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    [[self commandDelegate] sendPluginResult:pluginResult callbackId:[command callbackId]];
}

#pragma mark GPPSignInDelegate

- (void)finishedWithAuth:(GTMOAuth2Authentication *)auth error:(NSError *) error
{
    // Pass the token to the callback.
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:[auth accessToken]];
    [[self commandDelegate] sendPluginResult:pluginResult callbackId:[self callbackId]];

    // Clear the callback id.
    [self setCallbackId:nil];
}

@end

