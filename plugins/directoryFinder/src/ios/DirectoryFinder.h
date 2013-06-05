// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import <Cordova/CDVPlugin.h>

enum FileSystemCategory {
    APP = 0,
    DATA = 1,
    DOCUMENTS = 2
};
typedef int FileSystemCategory;

enum FileSystemPersistence {
    CACHE = 0,
    DEVICE_PERSISTENT = 1,
    PERSISTENT = 2,
    TEMPORARY = 3
};
typedef int FileSystemPersistence;

@interface DirectoryFinder : CDVPlugin

- (void)getDirectoryForPurpose:(CDVInvokedUrlCommand *)command;

@end
