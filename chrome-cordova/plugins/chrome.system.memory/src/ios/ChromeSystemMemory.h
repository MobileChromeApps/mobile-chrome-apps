// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import <Cordova/CDVPlugin.h>
#import <Foundation/Foundation.h>

@interface ChromeSystemMemory : CDVPlugin

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView;
- (void)getInfo:(CDVInvokedUrlCommand*)command;

@end
