// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import <Cordova/CDVPlugin.h>
#import <Foundation/Foundation.h>
#import <GooglePlus/GooglePlus.h>

@interface ChromeIdentity : CDVPlugin <GPPSignInDelegate>

@property (nonatomic, copy) NSString* callbackId;

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView;

@end

