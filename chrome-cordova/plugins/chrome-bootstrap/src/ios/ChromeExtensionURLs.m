// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import <AssetsLibrary/ALAsset.h>
#import <AssetsLibrary/ALAssetRepresentation.h>
#import <AssetsLibrary/ALAssetsLibrary.h>

#import <Cordova/CDVPlugin.h>
#import <Cordova/CDVViewController.h>

@interface ChromeExtensionURLs : CDVPlugin
@end

@interface ChromeURLProtocol : NSURLProtocol {
    NSURLConnection* _activeConnection;
}
@end

static NSString* const kChromeExtensionURLScheme = @"chrome-extension";
static ChromeURLProtocol *outstandingDelayRequest;
static NSString* pathPrefix;


#pragma mark ChromeExtensionURLs

@implementation ChromeExtensionURLs

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];
    if (self) {
        [NSURLProtocol registerClass:[ChromeURLProtocol class]];
        pathPrefix = [[[NSBundle mainBundle] resourcePath] stringByAppendingPathComponent:@"www"];
    }
    return self;
}

// On a "release" command, trigger the chrome-content-loaded url to finish loading immediately.
- (void)release:(CDVInvokedUrlCommand*)command
{
    CDVPluginResult *pluginResult = nil;

    if (outstandingDelayRequest != nil) {
        NSURLResponse *response = [[NSHTTPURLResponse alloc] initWithURL:outstandingDelayRequest.request.URL
                                                              statusCode:200
                                                             HTTPVersion:@"HTTP/1.1"
                                                            headerFields:@{@"Cache-Control": @"no-cache"}];
        [[outstandingDelayRequest client] URLProtocol:outstandingDelayRequest
                                   didReceiveResponse:response
                                   cacheStoragePolicy:NSURLCacheStorageNotAllowed];

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

- (void)startLoading
{
    NSURL *url = [[self request] URL];
    NSString *pathString = [url relativePath];
    if ([pathString isEqualToString:@"/chrome-content-loaded"]) {
        // If the request is for the special URL "chrome-extension://<any host>/chrome-content-loaded",
        // then do not return anything yet. Save this URLProtocol instance for future processing.
        outstandingDelayRequest = self;
    } else {
        // pathString always starts with a /.
        NSString *path = [pathPrefix stringByAppendingString:pathString];
        // Use a NSURLConnection to play nice with App Harness.
        NSMutableURLRequest* req = [[self request] mutableCopy];
        [req setURL:[NSURL fileURLWithPath:path]];
        _activeConnection = [[NSURLConnection alloc] initWithRequest:req delegate:self];
    }
}

- (void)stopLoading {
    [_activeConnection cancel];
}

- (void)connection:(NSURLConnection *)connection didReceiveResponse:(NSURLResponse *)response {
    // Create a new response rather than forwarding the parameter in order to fix up the URL.
    NSDictionary* headers = [NSDictionary dictionaryWithObjectsAndKeys:
                             @"no-cache", @"Cache-Control",
                             [NSString stringWithFormat:@"%lld", [response expectedContentLength]], @"Content-Length",
                             [response MIMEType], @"Content-Type", // Ignore if MIMEType method return nil.
                             nil];
    NSURLResponse *resp = [[NSHTTPURLResponse alloc] initWithURL:[[self request] URL] statusCode:200 HTTPVersion:@"HTTP/1.1" headerFields:headers];

    [[self client] URLProtocol:self didReceiveResponse:resp cacheStoragePolicy:NSURLCacheStorageNotAllowed];
}

- (void)connection:(NSURLConnection *)connection didReceiveData:(NSData *)data {
    [[self client] URLProtocol:self didLoadData:data];
}

- (NSCachedURLResponse *)connection:(NSURLConnection *)connection
                  willCacheResponse:(NSCachedURLResponse*)cachedResponse {
    return nil;
}

- (void)connectionDidFinishLoading:(NSURLConnection *)connection {
    [[self client] URLProtocolDidFinishLoading:self];
}

- (void)connection:(NSURLConnection *)connection didFailWithError:(NSError *)error {
    [[self client] URLProtocol:self didFailWithError:error];
}

@end

