// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import "ChromeSystemCpu.h"

#if CHROME_SYSTEM_CPU_VERBOSE_LOGGING
#define VERBOSE_LOG NSLog
#else
#define VERBOSE_LOG(args...) do {} while (false)
#endif

@interface ChromeSystemCpu () {
    NSOperationQueue* _executor;
}
- (void)_getInfo:(CDVInvokedUrlCommand*)command;
@end

@implementation ChromeSystemCpu

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];
    if (self) {
        _executor = [NSOperationQueue new];
        [_executor setMaxConcurrentOperationCount:1];
    }
    return self;
}

- (NSString*)getOperatingSystemArch
{
    return @"";//System.getProperty("os.arch");
}

- (NSNumber *)getProcessorCount
{
    return [NSNumber numberWithInt:[[NSProcessInfo processInfo] processorCount]];
}

- (void)getInfo:(CDVInvokedUrlCommand*)command
{
    NSInvocationOperation* operation = [[NSInvocationOperation alloc] initWithTarget:self selector:@selector(_getInfo:) object:command];
    [_executor addOperation:operation];
}

- (void)_getInfo:(CDVInvokedUrlCommand*)command
{
    CDVPluginResult* pluginResult = nil;

    @try {

        NSMutableDictionary* info = [NSMutableDictionary dictionary];

        //    JSONArray processors = getCpuTimePerProcessor();
    
        [info setValue:[self getOperatingSystemArch] forKey:@"archName"];
        //    ret.put("features", getCpuFeatures());
        //    ret.put("modelName", getCpuModelName());
        //    ret.put("processors", processors);
        //    ret.put("numOfProcessors", processors.length());
        [info setValue:[self getProcessorCount] forKey:@"numOfProcessors"];

        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:info];
    } @catch (NSException* exception) {
        VERBOSE_LOG(@"%@ - %@", @"Error occured while getting CPU info", [exception debugDescription]);
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Could not get CPU info"];
    }

    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

@end
