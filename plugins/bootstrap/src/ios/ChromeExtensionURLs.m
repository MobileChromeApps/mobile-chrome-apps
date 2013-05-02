// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import "ChromeExtensionURLs.h"

#import <Cordova/CDVViewController.h>

#import <AssetsLibrary/ALAsset.h>
#import <AssetsLibrary/ALAssetRepresentation.h>
#import <AssetsLibrary/ALAssetsLibrary.h>
#import <MobileCoreServices/MobileCoreServices.h>

#pragma mark declare


@interface ChromeURLProtocol : NSURLProtocol
@end

@interface ChromeAppCORSURLProtocol : NSURLProtocol {
    NSURLConnection *proxyConnection;
}
@end

//static NSMutableDictionary *whitelists;

static ChromeURLProtocol *outstandingDelayRequest;

static NSString* pathPrefix;

/* This is copied directly from CDVURLProtocol, where it is declared static,
   for compatibility with Cordova 2.7. In 2.8, CDVViewControllerForRequest should
   be a public API, and we will be able to remove this code.
*/

// Returns the registered view controller that sent the given request.
// If the user-agent is not from a UIWebView, or if it's from an unregistered one,
// then nil is returned.
CDVViewController *_viewControllerForRequest(NSURLRequest* request)
{
    // The exec bridge explicitly sets the VC address in a header.
    // This works around the User-Agent not being set for file: URLs.
    NSString* addrString = [request valueForHTTPHeaderField:@"vc"];

    if (addrString == nil) {
        NSString* userAgent = [request valueForHTTPHeaderField:@"User-Agent"];
        if (userAgent == nil) {
            return nil;
        }
        NSUInteger bracketLocation = [userAgent rangeOfString:@"(" options:NSBackwardsSearch].location;
        if (bracketLocation == NSNotFound) {
            return nil;
        }
        addrString = [userAgent substringFromIndex:bracketLocation + 1];
    }

    long long viewControllerAddress = [addrString longLongValue];
//    @synchronized(gRegisteredControllers) {
//        if (![gRegisteredControllers containsObject:[NSNumber numberWithLongLong:viewControllerAddress]]) {
//            return nil;
//        }
//    }

    return (__bridge CDVViewController*)(void*)viewControllerAddress;
}



#pragma mark ChromeExtensionURLs

@implementation ChromeExtensionURLs

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];
    if (self) {
        [NSURLProtocol registerClass:[ChromeAppCORSURLProtocol class]];
        [NSURLProtocol registerClass:[ChromeURLProtocol class]];

        pathPrefix = [[NSBundle mainBundle] pathForResource:@"chromeapp.html" ofType:@"" inDirectory:@"www"];
        NSRange range = [pathPrefix rangeOfString:@"www"];
        pathPrefix = [[pathPrefix substringToIndex:NSMaxRange(range)] stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]];
    }
    return self;
}

// On a "release" command, trigger the chrome-content-loaded url to finish loading immediately.
- (void)release:(CDVInvokedUrlCommand*)command
{
    CDVPluginResult *pluginResult = nil;

    if (outstandingDelayRequest != nil) {
        NSURLResponse *response = [[NSHTTPURLResponse alloc] initWithURL:[[NSURL alloc] initWithString:@"chrome-extension://null/chrome-content-loaded"] statusCode:200 HTTPVersion:@"HTTP/1.1" headerFields:@{}];
        [[outstandingDelayRequest client] URLProtocol:outstandingDelayRequest didReceiveResponse:response cacheStoragePolicy:NSURLCacheStorageNotAllowed];

        [[outstandingDelayRequest client] URLProtocolDidFinishLoading:outstandingDelayRequest];
        outstandingDelayRequest = nil;
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    } else {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"No outstanding chrome-content-loaded requests"];
    }
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

@end

#pragma mark ChromeURLProtocol

@implementation ChromeURLProtocol

+ (BOOL)canInitWithRequest:(NSURLRequest*)request
{
    NSURL* url = [request URL];
    return [[url scheme] isEqualToString:kChromeExtensionURLScheme] && ![[url path] isEqualToString:@"/!gap_exec"];
}

+ (NSURLRequest*)canonicalRequestForRequest:(NSURLRequest*)request
{
    return request;
}

+ (BOOL)requestIsCacheEquivalent:(NSURLRequest*)requestA toRequest:(NSURLRequest*)requestB
{
    return [[[requestA URL] resourceSpecifier] isEqualToString:[[requestB URL] resourceSpecifier]];
}

- (void)startLoading
{
    NSURL *url = [[self request] URL];
    NSString *pathString = [url relativePath];
    if ([pathString isEqualToString:@"/chrome-content-loaded"]) {
        // If the request is for the special URL "chrome-extension://<any host>/chrome-content-loaded",
        // then do not return anything yet. Save this URLProtocol instance for future processing.
        outstandingDelayRequest = self;
    } else {
        NSString *path = [NSString stringWithFormat:@"%@/%@", pathPrefix, pathString];
        FILE *fp = fopen([path UTF8String], "r");
        if (fp) {
            NSURLResponse *response = [[NSHTTPURLResponse alloc] initWithURL:url statusCode:200 HTTPVersion:@"HTTP/1.1" headerFields:@{}];
            [[self client] URLProtocol:self didReceiveResponse:response cacheStoragePolicy:NSURLCacheStorageNotAllowed];

            char buf[32768];
            size_t len;
            while ((len = fread(buf,1,sizeof(buf),fp))) {
                [[self client] URLProtocol:self didLoadData:[NSData dataWithBytes:buf length:len]];
            }
            fclose(fp);

            [[self client] URLProtocolDidFinishLoading:self];

        } else {
            NSURLResponse *response = [[NSHTTPURLResponse alloc] initWithURL:url statusCode:404 HTTPVersion:@"HTTP/1.1" headerFields:@{}];
            [[self client] URLProtocol:self didReceiveResponse:response cacheStoragePolicy:NSURLCacheStorageNotAllowed];
            [[self client] URLProtocolDidFinishLoading:self];
        }
    }
}

- (void)stopLoading
{
    // do any cleanup here
}

@end

#pragma mark ChromeAppCORSURLProtocol

@implementation ChromeAppCORSURLProtocol

+ (BOOL)canInitWithRequest:(NSURLRequest*)request
{
    NSURL* url = [request URL];
    if ([[[url scheme] lowercaseString] isEqualToString:@"http"] || [[[url scheme] lowercaseString] isEqualToString:@"https"]) {
        if ([[request valueForHTTPHeaderField:@"Origin"] length] > 0) {
            CDVViewController *vc = _viewControllerForRequest(request);
            return [vc.whitelist URLIsAllowed:url];
        }
    }
    return NO;
}

+ (NSURLRequest*)canonicalRequestForRequest:(NSURLRequest*)request
{
    return request;
}

- (void)startLoading
{
    NSMutableURLRequest* newRequest = [[self request] mutableCopy];
    [newRequest setValue:nil forHTTPHeaderField:@"Origin"];
    proxyConnection = [[NSURLConnection alloc] initWithRequest:newRequest delegate:self];
}

- (void)connection:(NSURLConnection*)connection didReceiveResponse:(NSURLResponse*)response
{
    if ([response isKindOfClass:[NSHTTPURLResponse class]]) {
        NSHTTPURLResponse *hresponse = (NSHTTPURLResponse *)response;
        NSMutableDictionary *headers = [[hresponse allHeaderFields] mutableCopy];
        [headers setValue:@"*" forKey:@"Access-Control-Allow-Origin"];
        NSHTTPURLResponse *newResponse = [[NSHTTPURLResponse alloc]initWithURL:[hresponse URL] statusCode:[hresponse statusCode] HTTPVersion:@"HTTP/1.1" headerFields:headers];
        [[self client] URLProtocol:self didReceiveResponse:newResponse cacheStoragePolicy:NSURLCacheStorageAllowed];
    }
}

- (void)connection:(NSURLConnection*)connection didReceiveData:(NSData*)data
{
    [[self client] URLProtocol:self didLoadData:data];
}

- (void)connectionDidFinishLoading:(NSURLConnection*)connection
{
    [[self client] URLProtocolDidFinishLoading:self];
}

- (void)stopLoading
{
    proxyConnection = nil;
}

@end
