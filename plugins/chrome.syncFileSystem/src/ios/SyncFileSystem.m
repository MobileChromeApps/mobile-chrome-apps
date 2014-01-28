// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source file is governed by a BSD-style license that can be
// found in the LICENSE file.

#import "SyncFileSystem.h"

#pragma mark SyncFileSystem

@implementation SyncFileSystem

- (void)registerFileSystem
{
    if (_syncFs == nil) {
        id vc = self.viewController;
        CDVFile *filePlugin = [vc getCommandInstance:@"file"];
        if (filePlugin != nil) {
            NSArray *paths = NSSearchPathForDirectoriesInDomains(NSLibraryDirectory, NSUserDomainMask, YES);
            NSString *appLibraryPath = [paths objectAtIndex:0];
            NSString *syncFSPath = [appLibraryPath stringByAppendingPathComponent:@"/syncfs"];
            NSError *error;
            if ([[NSFileManager defaultManager] createDirectoryAtPath:syncFSPath
                                          withIntermediateDirectories:YES
                                                           attributes:nil
                                                                error:&error]) {
                _syncFs = [[CDVLocalFilesystem alloc] initWithName:@"syncable" root:syncFSPath];
                [filePlugin registerFilesystem:_syncFs];
            } else {
                NSLog(@"Unable to create syncfs directory: %@", error);
            }
        }
    }
}

- (CDVPlugin *)initWithWebView:(UIWebView *)theWebView
{
    self = [super initWithWebView:theWebView];
    if (self) {
        _syncFs = nil;
    }
    return self;
}

- (void)getRootURL:(CDVInvokedUrlCommand*)command
{
    [self registerFileSystem];
    CDVPluginResult *pluginResult = nil;
    pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:@"cdvfile://localhost/syncable/"];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

@end
