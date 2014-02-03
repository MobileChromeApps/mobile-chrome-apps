// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import <AssetsLibrary/ALAsset.h>
#import <AssetsLibrary/ALAssetRepresentation.h>
#import <AssetsLibrary/ALAssetsLibrary.h>
#import <MobileCoreServices/MobileCoreServices.h>

#import <Cordova/CDVPlugin.h>
#import <Cordova/CDVViewController.h>

@interface ChromeExtensionURLs : CDVPlugin
@end

@interface ChromeURLProtocol : NSURLProtocol
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
        NSString *path = [NSString stringWithFormat:@"%@/%@", pathPrefix, pathString];
        FILE *fp = fopen([path UTF8String], "r");
        if (fp) {
            NSURLResponse *response = [[NSHTTPURLResponse alloc] initWithURL:url statusCode:200 HTTPVersion:@"HTTP/1.1" headerFields:@{@"Cache-Control": @"no-cache"}];
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


