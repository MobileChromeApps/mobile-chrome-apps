// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import "ChromeStorage.h"

#if CHROME_STORAGE_VERBOSE_LOGGING
#define VERBOSE_LOG NSLog
#else
#define VERBOSE_LOG(args...) do {} while (false)
#endif

@interface ChromeStorage () {
    NSOperationQueue* _executor;
}
- (void)_get:(CDVInvokedUrlCommand*)command;
- (void)_getBytesInUse:(CDVInvokedUrlCommand*)command;
- (void)_set:(CDVInvokedUrlCommand*)command;
- (void)_remove:(CDVInvokedUrlCommand*)command;
- (void)_clear:(CDVInvokedUrlCommand*)command;

- (NSString*) getStorageFileForNamespace:(NSString*)namespace;
- (NSDictionary*) getStorageForNamespace:(NSString*)namespace;
- (void) setStorage:(NSDictionary*)values forNamespace:(NSString*)namespace;
- (NSDictionary*) getStoredValuesForKeys:(NSArray*)arguments UsingDefaultValues:(BOOL)useDefaultValues;
@end

@implementation ChromeStorage

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];
    if (self) {
        _executor = [NSOperationQueue  new];
        [_executor setMaxConcurrentOperationCount:1];
    }
    return self;
}

- (NSString*) getStorageFileForNamespace:(NSString*)namespace
{
    return [NSString stringWithFormat:@"chromestorage_%@", namespace];
}

- (NSDictionary*) getStorageForNamespace:(NSString*)namespace
{
    NSString *parentDir = [NSSearchPathForDirectoriesInDomains(NSLibraryDirectory, NSUserDomainMask, YES) objectAtIndex:0];
    NSString *filePath = [parentDir stringByAppendingPathComponent:[self getStorageFileForNamespace:namespace]];
    NSDictionary* storage = nil;
    NSFileManager *fileManager = [NSFileManager defaultManager];

    if ([fileManager fileExistsAtPath:filePath]){
        storage = [NSKeyedUnarchiver unarchiveObjectWithFile:filePath];
    } else {
        storage = [NSDictionary dictionary];
    }
    return storage;
}

- (void) setStorage:(NSMutableDictionary*)storage forNamespace:(NSString*)namespace
{
    NSString *parentDir = [NSSearchPathForDirectoriesInDomains(NSLibraryDirectory, NSUserDomainMask, YES) objectAtIndex:0];
    NSString *filePath = [parentDir stringByAppendingPathComponent:[self getStorageFileForNamespace:namespace]];

    if(![NSKeyedArchiver archiveRootObject:storage toFile:filePath]) {
        @throw [NSException exceptionWithName: @"Writing to file failed" reason:@"Unknown" userInfo:nil];
    }
}

- (NSDictionary*) getStoredValuesForKeys:(NSArray*)arguments UsingDefaultValues:(BOOL)useDefaultValues
{
    NSDictionary* ret = [NSDictionary dictionary];
    @try {
        NSString* namespace = [arguments objectAtIndex:0];
        id argumentAtIndexOne = [arguments objectAtIndex:1];
        NSArray* keys = [NSArray array];

        NSDictionary* jsonObject = nil;
        NSArray* jsonArray = nil;

        if (argumentAtIndexOne != nil) {
            if ([argumentAtIndexOne isKindOfClass:[NSDictionary class]]) {
                jsonObject = argumentAtIndexOne;
                keys = [jsonObject allKeys];
                if (useDefaultValues) {
                    ret = jsonObject;
                }
            } else if ([argumentAtIndexOne isKindOfClass:[NSArray class]]) {
                jsonArray = argumentAtIndexOne;
                keys = jsonArray;
            } else if ([argumentAtIndexOne isKindOfClass:[NSNull class]]) {
                keys = nil;
            }
        }

        if (keys == nil || [keys count]) {
            NSDictionary* storage = [self getStorageForNamespace:namespace];

            if (keys == nil) {
                ret = storage;
            } else {
                NSMutableDictionary* tempRet = [NSMutableDictionary dictionaryWithDictionary:ret];
                for (NSString* key in keys) {
                    id value = [storage objectForKey:key];
                    if (value != nil) {
                        [tempRet setObject:value forKey:key];
                    }
                }
                ret = [NSDictionary dictionaryWithDictionary:tempRet];
            }
        }
    } @catch (NSException* exception) {
        VERBOSE_LOG(@"%@ - %@", @"Could not retrieve storage", [exception debugDescription]);
        ret = nil;
    }

    return ret;
}


- (void)get:(CDVInvokedUrlCommand*)command
{
    NSInvocationOperation* operation = [[NSInvocationOperation alloc] initWithTarget:self selector:@selector(_get:) object:command];
    [_executor addOperation:operation];
}

- (void)_get:(CDVInvokedUrlCommand*)command
{
    CDVPluginResult* pluginResult = nil;
    NSDictionary* storage = [self getStoredValuesForKeys:[command arguments] UsingDefaultValues:true];

    if (storage == nil) {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Could not retrieve storage"];
    } else {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:storage];
    }

    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)getBytesInUse:(CDVInvokedUrlCommand *)command
{
    NSInvocationOperation* operation = [[NSInvocationOperation alloc] initWithTarget:self selector:@selector(_getBytesInUse:) object:command];
    [_executor addOperation:operation];
}

// NSNull isn't supported by NSPropertyListSerialization so replace nulls with NSNumber, which should have same size
- (NSDictionary*)_stripNulls:(NSDictionary *)dictionary {
    NSMutableDictionary* ret = [dictionary mutableCopy];

    [dictionary enumerateKeysAndObjectsUsingBlock:^(id key, id obj, BOOL *stop) {
        if (obj == [NSNull null]) {
            [ret setValue:@0 forKey:key];
        } else if ([obj isKindOfClass:[NSDictionary class]]) {
            [ret setValue:[self _stripNulls:obj] forKey:key];
        }
    }];

    return ret;
}

- (void)_getBytesInUse:(CDVInvokedUrlCommand *)command
{
    CDVPluginResult* pluginResult = nil;
    // TODO: if keys argument is null, we want the size of the whole file.. perhaps just use
    // UInt32 fileSize = [[[NSFileManager defaultManager] attributesOfItemAtPath:PATH error:nil] fileSize];
    NSDictionary* storage = [self getStoredValuesForKeys:[command arguments] UsingDefaultValues:false];
    NSString* errorString;
    NSUInteger size;

    storage = [self _stripNulls:storage];

    NSData *dataRep = [NSPropertyListSerialization dataFromPropertyList:storage format:NSPropertyListBinaryFormat_v1_0 errorDescription:&errorString];

    if(!dataRep) {
       VERBOSE_LOG(@"Error during size calculation - %@", errorString);
    } else {
        size = [dataRep length];
    }

    if (storage == nil || !dataRep) {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR  messageAsString:@"Could not retrieve storage"];
    } else {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:size];
    }

    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)set:(CDVInvokedUrlCommand*)command
{
    NSInvocationOperation* operation = [[NSInvocationOperation alloc] initWithTarget:self selector:@selector(_set:) object:command];
    [_executor addOperation:operation];
}

- (void)_set:(CDVInvokedUrlCommand*)command
{
    CDVPluginResult* pluginResult = nil;

    @try {
        NSString* namespace = [command.arguments objectAtIndex:0];
        NSDictionary* jsonObject = [command.arguments objectAtIndex:1];
        NSArray* keys = [jsonObject allKeys];
        NSMutableDictionary* oldValues = [NSMutableDictionary dictionary];

        if(keys != nil && [keys count]) {
            NSMutableDictionary* storage = [NSMutableDictionary dictionaryWithDictionary: [self getStorageForNamespace:namespace]];
            for (NSString* key in keys) {
                id oldValue = [storage objectForKey:key];
                if (oldValue != nil) {
                    [oldValues setObject:oldValue forKey:key];
                }
                NSObject* value = [jsonObject objectForKey:key];
                [storage setValue:value forKey:key];
            }
            [self setStorage:storage forNamespace:namespace];
        }
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:oldValues];
    } @catch (NSException *exception) {
        VERBOSE_LOG(@"%@ - %@", @"Could not update storage", [exception debugDescription]);
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Could not update storage"];
    }

    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)remove:(CDVInvokedUrlCommand*)command
{
    NSInvocationOperation* operation = [[NSInvocationOperation alloc] initWithTarget:self selector:@selector(_remove:) object:command];
    [_executor addOperation:operation];
}

- (void)_remove:(CDVInvokedUrlCommand*)command
{
    CDVPluginResult* pluginResult = nil;

    @try {
        NSString* namespace = [command.arguments objectAtIndex:0];
        id argumentAtIndexOne = [command.arguments objectAtIndex:1];
        NSArray* keys = [NSArray array];

        NSDictionary* jsonObject = nil;
        NSArray* jsonArray = nil;
        NSMutableDictionary* oldValues = [NSMutableDictionary dictionary];

        if (argumentAtIndexOne != nil) {
            if ([argumentAtIndexOne isKindOfClass:[NSDictionary class]]) {
                jsonObject = argumentAtIndexOne;
                keys = [jsonObject allKeys];
            } else if ([argumentAtIndexOne isKindOfClass:[NSArray class]]) {
                jsonArray = argumentAtIndexOne;
                keys = jsonArray;
            }
        }

        if (keys == nil || [keys count]) {
            NSMutableDictionary* storage = [NSMutableDictionary dictionaryWithDictionary: [self getStorageForNamespace:namespace]];
            for (NSString* key in keys) {
                id oldValue = [storage objectForKey:key];
                if (oldValue != nil) {
                    [oldValues setObject:oldValue forKey:key];
                }
                [storage removeObjectForKey:key];
            }
            [self setStorage:storage forNamespace:namespace];
        }
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:oldValues];
    } @catch (NSException* exception) {
        VERBOSE_LOG(@"%@ - %@", @"Could not update storage", [exception debugDescription]);
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Could not update storage"];
    }

    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)clear:(CDVInvokedUrlCommand*)command
{
    NSInvocationOperation* operation = [[NSInvocationOperation alloc] initWithTarget:self selector:@selector(_clear:) object:command];
    [_executor addOperation:operation];
}

- (void)_clear:(CDVInvokedUrlCommand*)command
{
    CDVPluginResult* pluginResult = nil;

    @try {
        NSString* namespace = [command.arguments objectAtIndex:0];
        NSDictionary* oldValues = [self getStorageForNamespace:namespace];
        NSMutableDictionary* storage = [NSMutableDictionary dictionary];
        [self setStorage:storage forNamespace:namespace];
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:oldValues];
    } @catch (NSException* exception) {
        VERBOSE_LOG(@"%@ - %@", @"Could not clear storage", [exception debugDescription]);
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Could not clear storage"];
    }

    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

@end
