// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import <Foundation/Foundation.h>
#import <Cordova/CDVPlugin.h>

@class GCDAsyncSocket;

@interface ChromeSocketsTcp : CDVPlugin

- (NSUInteger)registerAcceptedSocket:(GCDAsyncSocket*)theSocket;

@end
