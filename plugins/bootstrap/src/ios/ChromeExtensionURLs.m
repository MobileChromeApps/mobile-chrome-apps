// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import "ChromeExtensionURLs.h"

#import <AssetsLibrary/ALAsset.h>
#import <AssetsLibrary/ALAssetRepresentation.h>
#import <AssetsLibrary/ALAssetsLibrary.h>
#import <MobileCoreServices/MobileCoreServices.h>

#pragma mark declare

@interface ChromeURLProtocol : NSURLProtocol
@end

static NSString* pathPrefix;

#pragma mark ChromeExtensionURLs

@implementation ChromeExtensionURLs

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];
    if (self) {
        [NSURLProtocol registerClass:[ChromeURLProtocol class]];

        pathPrefix = [[NSBundle mainBundle] pathForResource:@"chromeapp.html" ofType:@"" inDirectory:@"www"];
        NSRange range = [pathPrefix rangeOfString:@"www"];
        pathPrefix = [[pathPrefix substringToIndex:NSMaxRange(range)] stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]];
    }
    return self;
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
    NSString *path = [NSString stringWithFormat:@"%@/%@", pathPrefix, pathString];

    FILE *fp = fopen([path UTF8String], "r");
    if (fp) {
        NSURLResponse *response = [[NSURLResponse alloc] initWithURL:url MIMEType:nil expectedContentLength:-1 textEncodingName:nil];
        [[self client] URLProtocol:self didReceiveResponse:response cacheStoragePolicy:NSURLCacheStorageNotAllowed];

        char buf[32768];
        size_t len;
        while ((len = fread(buf,1,sizeof(buf),fp))) {
            [[self client] URLProtocol:self didLoadData:[NSData dataWithBytes:buf length:len]];
        }
        fclose(fp);

        [[self client] URLProtocolDidFinishLoading:self];
    } else {
//        [[self client] URLProtocol:self didFailWithError:nil];
        NSURLResponse *response = [[NSURLResponse alloc] initWithURL:url MIMEType:nil expectedContentLength:-1 textEncodingName:nil];
        [[self client] URLProtocol:self didReceiveResponse:response cacheStoragePolicy:NSURLCacheStorageNotAllowed];
        [[self client] URLProtocolDidFinishLoading:self];
    }
}

- (void)stopLoading
{
    // do any cleanup here
}

@end
