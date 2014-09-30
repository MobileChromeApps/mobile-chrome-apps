// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import "ChromeSystemMemory.h"
#import <mach/mach.h>
#import <mach/mach_host.h>

#if CHROME_SYSTEM_MEMORY_VERBOSE_LOGGING
#define VERBOSE_LOG NSLog
#else
#define VERBOSE_LOG(args...) do {} while (false)
#endif

@implementation ChromeSystemMemory

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];
    return self;
}

- (NSNumber *)getAvailableMemory
{
    mach_port_t host_port;
    mach_msg_type_number_t host_size;
    vm_size_t pagesize;

    host_port = mach_host_self();
    host_size = sizeof(vm_statistics_data_t) / sizeof(integer_t);
    host_page_size(host_port, &pagesize);        

    vm_statistics_data_t vm_stat;

    if (host_statistics(host_port, HOST_VM_INFO, (host_info_t)&vm_stat, &host_size) != KERN_SUCCESS) {
        NSException* myException = [NSException
                exceptionWithName:@"InvalidOperationException"
                reason:@"Failed to fetch vm statistics"
                userInfo:nil];
        @throw myException;
    }
    
    /* Stats in bytes */ 
    natural_t mem_free = vm_stat.free_count * pagesize;
    
    return @(mem_free);
}

- (void)getInfo:(CDVInvokedUrlCommand*)command
{
    [self.commandDelegate runInBackground:^{
        CDVPluginResult* pluginResult = nil;

        @try {

            NSMutableDictionary* info = [NSMutableDictionary dictionary];

            [info setValue:[self getAvailableMemory] forKey:@"availableCapacity"];
            [info setValue:[NSNumber numberWithUnsignedLongLong:[[NSProcessInfo processInfo] physicalMemory]] forKey:@"capacity"];

            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:info];
        } @catch (NSException* exception) {
            VERBOSE_LOG(@"%@ - %@", @"Error occured while getting memory info", [exception debugDescription]);
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Could not get memory info"];
        }

        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }];
}

@end
