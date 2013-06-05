// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import "DirectoryFinder.h"

@implementation DirectoryFinder

- (void)getDirectoryForPurpose:(CDVInvokedUrlCommand *)command {
    // BOOL writable = [[command argumentAtIndex:0] boolValue];
    FileSystemCategory category = [[command argumentAtIndex:2] intValue];
    FileSystemPersistence persistence = [[command argumentAtIndex:3] intValue];

    NSString *path;

    if (category == APP) {
        path = [[NSBundle mainBundle] bundlePath];
    } else if (persistence == CACHE) {
        path = [NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES) objectAtIndex:0];
    } else if (persistence == DEVICE_PERSISTENT) {
        NSString *parentPath;
        if (category == DATA) {
            parentPath = [NSSearchPathForDirectoriesInDomains(NSLibraryDirectory, NSUserDomainMask, YES) objectAtIndex:0];
        } else if (category == DOCUMENTS) {
            parentPath = [NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES) objectAtIndex:0];
        }

        // TODO(maxw): Set the necessary attribute to make this unsynced.
        path = [NSString stringWithFormat:@"%@/NoCloud", parentPath];
    } else if (persistence == PERSISTENT) {
        if (category == DATA) {
            path = [NSSearchPathForDirectoriesInDomains(NSLibraryDirectory, NSUserDomainMask, YES) objectAtIndex:0];
        } else if (category == DOCUMENTS) {
            path = [NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES) objectAtIndex:0];
        }
    } else if (persistence == TEMPORARY) {
        path = NSTemporaryDirectory();
    }

    CDVPluginResult *pluginResult;

    if (!path) {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR];
    } else {
        // Remove the trailing slash if it's there.
        if ([path hasSuffix:@"/"]) {
            path = [path substringToIndex:[path length] - 1];
        }

        NSDictionary *directoryEntry = [DirectoryFinder getDirectoryEntryForPath:path];
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:directoryEntry];
    }

    [[self commandDelegate] sendPluginResult:pluginResult callbackId:[command callbackId]];
}

+ (NSDictionary *)getDirectoryEntryForPath:(NSString *)path {
    NSMutableDictionary* directoryEntry = [NSMutableDictionary dictionaryWithCapacity:4];
    [directoryEntry setObject:[NSNumber numberWithBool:NO] forKey:@"isFile"];
    [directoryEntry setObject:[NSNumber numberWithBool:YES] forKey:@"isDirectory"];
    [directoryEntry setObject:[path lastPathComponent] forKey:@"name"];
    [directoryEntry setObject:path forKey:@"fullPath"];
    return directoryEntry;
}

@end
