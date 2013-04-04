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

#pragma mark ChromeExtensionURLs

@implementation ChromeExtensionURLs

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];
    if (self) {
        [NSURLProtocol registerClass:[ChromeURLProtocol class]];
    }
    return self;
}

@end

#pragma mark ChromeURLProtocol

@implementation ChromeURLProtocol

+ (BOOL)canInitWithRequest:(NSURLRequest*)request
{
    NSURL* url = [request URL];
    return [[url scheme] isEqualToString:kChromeExtensionURLScheme];
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
    NSString *pathPrefix = @"/Users/mmocny/Library/Application%20Support/iPhone%20Simulator/6.1/Applications/5E0B6699-6172-4567-901D-0B64A6A5D5F7/ChromeSpec.app/www"; // [self.commandDelegate pathForResource:self.startPage];
    NSString *pathString = [url resourceSpecifier];
    NSString *path = [NSString stringWithFormat:@"%@/%@", pathPrefix, pathString];
    
    
    NSURLResponse *response = [[NSURLResponse alloc] initWithURL:url MIMEType:nil expectedContentLength:-1 textEncodingName:nil];
    FILE *fp = fopen([path UTF8String], "r");
    if (fp) {
        char buf[32768];
        size_t len;
        [[self client] URLProtocol:self didReceiveResponse:response cacheStoragePolicy:NSURLCacheStorageNotAllowed];
        while ((len = fread(buf,1,sizeof(buf),fp))) {
            [[self client] URLProtocol:self didLoadData:[NSData dataWithBytes:buf length:len]];
        }
        fclose(fp);
    }
    [[self client] URLProtocolDidFinishLoading:self];
}

- (void)stopLoading
{
    // do any cleanup here
}

@end