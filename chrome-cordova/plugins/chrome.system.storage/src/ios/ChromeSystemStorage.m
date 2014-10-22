// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import <Cordova/CDVPlugin.h>
#import <Foundation/Foundation.h>
#import <UIKit/UIScreen.h>

#if CHROME_SYSTEM_STORAGE_VERBOSE_LOGGING
#define VERBOSE_LOG NSLog
#else
#define VERBOSE_LOG(args...) do {} while (false)
#endif

@interface ChromeSystemStorage : CDVPlugin

- (void)getInfo:(CDVInvokedUrlCommand*)command;
- (void)ejectDevice:(CDVInvokedUrlCommand*)command;
- (void)getAvailableCapacity:(CDVInvokedUrlCommand*)command;

@end

@implementation ChromeSystemStorage
{
    NSString* _externalStorageId;
}

NSString *const StorageErrorDomain = @"ChromeSystemStorageErrorDomain";

typedef enum {Total, Available} CapacityType;

- (NSString*)builtInStorageId
{
    if (_externalStorageId == nil) {
        _externalStorageId = [[NSUUID UUID] UUIDString];
    }
    return _externalStorageId;
}

- (BOOL)isBuiltInStorageId:(NSString*)unitId
{
    if (!unitId)
    {
        return NO;
    }

    return ([unitId caseInsensitiveCompare:[self builtInStorageId]] == NSOrderedSame);
}

- (NSDictionary*)buildStorageUnitInfo:(NSString*)id name:(NSString*)name type:(NSString*)type capacity:(NSNumber*)capacity
{
    return @{
        @"id": id,
        @"name": name,
        @"type": type,
        @"capacity": capacity
    };
}

- (NSNumber*)getBuiltInCapacity:(CapacityType)type error:(NSError **)error
{
    NSString *path = [NSSearchPathForDirectoriesInDomains(NSLibraryDirectory, NSUserDomainMask, YES) objectAtIndex:0];
    NSDictionary *fileAttributes = [[NSFileManager defaultManager] attributesOfFileSystemForPath:path error:error];

    if (!fileAttributes) {
        return nil;
    }

    NSString  *key = nil;
    switch (type)
    {
        case Total:
            key = NSFileSystemSize;
            break;

        case Available:
            key = NSFileSystemFreeSize;
            break;

        default:
            if (error)
            {
                *error = [NSError errorWithDomain:StorageErrorDomain
                                             code:NSFileReadUnknownError
                                         userInfo:@{
                                                    NSLocalizedDescriptionKey: [NSString stringWithFormat:@"Invalid capacity type: %d", type]
                                                    }];
            }
            VERBOSE_LOG(@"Invalid capacity type: %d", type);
            return nil;
    }

    NSNumber *capacity = [fileAttributes objectForKey: key];

    return capacity;
}

- (NSDictionary*)getBuiltInStorage:(NSError **)error
{
    NSNumber *fileSystemSizeInBytes = [self getBuiltInCapacity:Total error:error];

    if (!fileSystemSizeInBytes)
    {
        return nil;
    }

    return [self buildStorageUnitInfo:[self builtInStorageId] name:@"Built-in Storage" type:@"fixed" capacity:fileSystemSizeInBytes];
}

- (void)getInfo:(CDVInvokedUrlCommand*)command
{
    [self.commandDelegate runInBackground:^{
        CDVPluginResult* pluginResult = nil;

        NSError* error = nil;
        NSDictionary* builtinStorage = [self getBuiltInStorage:&error];

        if (builtinStorage)
        {
            NSMutableArray* units = [NSMutableArray array];

            [units addObject:builtinStorage];

            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:units];
        }
        else
        {
            NSLog(@"Error occured while getting Storage Info - %@", [error localizedDescription]);
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Could not get Storage Info"];
        }

        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }];
}

- (void)ejectDevice:(CDVInvokedUrlCommand*)command
{
    [self.commandDelegate runInBackground:^{

        NSString* unitId = [[command arguments] objectAtIndex:0];
        NSString* result = nil;

        if ([self isBuiltInStorageId:unitId]) {
            // Provided the id for built-in storage, which can never be ejected
            result = @"in_use";
        }
        else
        {
            result = @"no_such_device";
        }

        CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:result];

        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }];
}

- (void)getAvailableCapacity:(CDVInvokedUrlCommand*)command
{
    [self.commandDelegate runInBackground:^{
        CDVPluginResult* pluginResult = nil;

        NSString* unitId = [[command arguments] objectAtIndex:0];

        if ([self isBuiltInStorageId:unitId]) {
            // Provided the id for built-in storage
            NSError* error = nil;
            NSNumber *fileSystemFreeSizeInBytes = [self getBuiltInCapacity:Available error:&error];

            if (fileSystemFreeSizeInBytes)
            {
                NSDictionary* info = @{
                                       @"id": unitId,
                                       @"availableCapacity": fileSystemFreeSizeInBytes
                                       };
                pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:info];
            }
            else
            {
                NSLog(@"Error occured while getting available capacity - %@", [error localizedDescription]);
                pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR
                                                 messageAsString:@"Could not get available capacity"];
            }
        }
        else
        {
            // Unknown device, return "undefined" for consistency with desktop behaviour
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:nil];
        }

        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }];
}

- (void)messageChannel:(CDVInvokedUrlCommand*)command
{
    // No-op, as iOS does not fire any events/send messages back to JS
}

@end
