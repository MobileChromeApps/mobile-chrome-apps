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
    NSString *originalOrigin;
    NSString *CORSRequestHeaders;
    NSString *CORSRequestMethod;
    BOOL isRequestAuthenticated;
}
@end

static NSMutableDictionary *whitelists;

static ChromeURLProtocol *outstandingDelayRequest;

static NSString* pathPrefix;

#pragma mark ChromeExtensionURLs

@implementation ChromeExtensionURLs

__attribute__((constructor))
static void initialize_whitlist_dict() {
  whitelists = [[NSMutableDictionary alloc] init];
}

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];
    if (self) {
        [NSURLProtocol registerClass:[ChromeAppCORSURLProtocol class]];
        [NSURLProtocol registerClass:[ChromeURLProtocol class]];

        pathPrefix = [[NSBundle mainBundle] pathForResource:@"chromeapp.html" ofType:@"" inDirectory:@"www"];
        NSRange range = [pathPrefix rangeOfString:@"www"];
        pathPrefix = [[pathPrefix substringToIndex:NSMaxRange(range)] stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]];

        [whitelists setObject:self forKey:@"plugin"];

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
            CDVPlugin *plugin = [whitelists valueForKey:@"plugin"];
            return [plugin.commandDelegate URLIsWhitelisted:url];
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
    originalOrigin = [[self request] valueForHTTPHeaderField:@"Origin"];
    isRequestAuthenticated = [[self request] valueForHTTPHeaderField:@"Authorization"] != nil;
    CORSRequestHeaders = [[self request] valueForHTTPHeaderField:@"Access-Control-Request-Headers"];
    CORSRequestMethod = [[self request] valueForHTTPHeaderField:@"Access-Control-Request-Method"];
    [newRequest setValue:nil forHTTPHeaderField:@"Origin"];
    proxyConnection = [[NSURLConnection alloc] initWithRequest:newRequest delegate:self];
}

- (void)connection:(NSURLConnection*)connection didReceiveResponse:(NSURLResponse*)response
{
    if ([response isKindOfClass:[NSHTTPURLResponse class]]) {
        NSHTTPURLResponse *hresponse = (NSHTTPURLResponse *)response;
        NSMutableDictionary *headers = [[hresponse allHeaderFields] mutableCopy];
        if (isRequestAuthenticated || [headers valueForKey:@"WWW-Authenticate"] != nil ||
        CORSRequestHeaders != nil) {
            [headers setValue:originalOrigin forKey:@"Access-Control-Allow-Origin"];
            [headers setValue:@"true" forKey:@"Access-Control-Allow-Credentials"];
            if (CORSRequestHeaders != nil) {
                [headers setValue:CORSRequestHeaders forKey:@"Access-Control-Allow-Headers"];
            }
            if (CORSRequestMethod != nil) {
              [headers setValue:CORSRequestMethod forKey:@"Access-Control-Allow-Methods"];
            }
        } else {
            [headers setValue:@"*" forKey:@"Access-Control-Allow-Origin"];
        }
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
