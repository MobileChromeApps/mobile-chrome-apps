// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source file is governed by a BSD-style license that can be
// found in the LICENSE file.

#import <Cordova/CDVPlugin.h>
#import "CDVFile.h"
#import "CDVLocalFilesystem.h"

@interface SyncFileSystem : CDVPlugin {
CDVLocalFilesystem *_syncFs;
}

- (CDVPlugin *)initWithWebView:(UIWebView *)theWebView;
- (void)getRootURL:(CDVInvokedUrlCommand*)command;

@end
