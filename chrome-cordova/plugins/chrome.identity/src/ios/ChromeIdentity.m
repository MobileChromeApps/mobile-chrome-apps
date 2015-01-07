// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import <GoogleOpenSource/GoogleOpenSource.h>
#import <GooglePlus/GooglePlus.h>
#import "AppDelegate.h"
#import "ChromeIdentity.h"

#if CHROME_IDENTITY_VERBOSE_LOGGING
#define VERBOSE_LOG NSLog
#else
#define VERBOSE_LOG(args...) do {} while (false)
#endif

static void swizzleMethod(Class class, SEL destinationSelector, SEL sourceSelector);

@implementation AppDelegate (IdentityUrlHandling)

+ (void)load
{
    // Add a necessary method to AppDelegate.
    swizzleMethod([AppDelegate class], @selector(application:openURL:sourceApplication:annotation:), @selector(identity_application:openURL:sourceApplication:annotation:));
}

- (BOOL)identity_application: (UIApplication *)application
                     openURL: (NSURL *)url
           sourceApplication: (NSString *)sourceApplication
                  annotation: (id)annotation {
    [self identity_application:application openURL:url sourceApplication:sourceApplication annotation:annotation];
    return [GPPURLHandler handleURL:url
                  sourceApplication:sourceApplication
                         annotation:annotation];
}

@end

@implementation ChromeIdentity

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];

    GPPSignIn *signIn = [GPPSignIn sharedInstance];
    [signIn setShouldFetchGoogleUserEmail:YES];
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

- (void)getAccounts:(CDVInvokedUrlCommand*)command
{
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_INVALID_ACTION messageAsString:@"getAccounts not supported on iOS."];
    [[self commandDelegate] sendPluginResult:pluginResult callbackId:[command callbackId]];
}

#pragma mark GPPSignInDelegate

- (void)finishedWithAuth:(GTMOAuth2Authentication *)auth error:(NSError *) error
{
    NSString* callbackId = self.callbackId;
    self.callbackId = nil;
    if (auth == nil) {
        // Assume user cancelled. error object just has -1 - Unknown Error in this case.
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsInt:-4];
        [[self commandDelegate] sendPluginResult:pluginResult callbackId:callbackId];
    } else {
        // Compile the results.
        NSDictionary *resultDictionary = [[NSMutableDictionary alloc] init];
        [resultDictionary setValue:[auth userEmail] forKey:@"account"];
        [resultDictionary setValue:[auth accessToken] forKey:@"token"];

        // Pass the results to the callback.
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:resultDictionary];
        [[self commandDelegate] sendPluginResult:pluginResult callbackId:callbackId];
    }

}

#pragma mark Swizzling

@end

static void swizzleMethod(Class class, SEL destinationSelector, SEL sourceSelector)
{
    Method destinationMethod = class_getInstanceMethod(class, destinationSelector);
    Method sourceMethod = class_getInstanceMethod(class, sourceSelector);

    // If the method doesn't exist, add it.  If it does exist, replace it with the given implementation.
    if (class_addMethod(class, destinationSelector, method_getImplementation(sourceMethod), method_getTypeEncoding(sourceMethod))) {
        class_replaceMethod(class, destinationSelector, method_getImplementation(destinationMethod), method_getTypeEncoding(destinationMethod));
    } else {
        method_exchangeImplementations(destinationMethod, sourceMethod);
    }
}

