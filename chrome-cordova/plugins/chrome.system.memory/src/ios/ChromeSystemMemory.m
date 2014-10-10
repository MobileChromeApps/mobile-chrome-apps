// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import <Cordova/CDVPlugin.h>
#import <Foundation/Foundation.h>
#import <mach/mach.h>
#import <mach/mach_host.h>

#if CHROME_SYSTEM_MEMORY_VERBOSE_LOGGING
#define VERBOSE_LOG NSLog
#else
#define VERBOSE_LOG(args...) do {} while (false)
#endif

@interface ChromeSystemMemory : CDVPlugin

- (void)getInfo:(CDVInvokedUrlCommand*)command;

@end

@implementation ChromeSystemMemory


- (NSError *)kernelCallError:(NSString *)errMsg
{
    int code = errno;
	NSString *codeDescription = [NSString stringWithUTF8String:strerror(code)];

	NSDictionary* userInfo = @{
                              NSLocalizedDescriptionKey: [NSString stringWithFormat:@"%@: %d - %@", errMsg, code, codeDescription]
                              };
	
	return [NSError errorWithDomain:NSPOSIXErrorDomain code:code userInfo:userInfo];
}

- (NSNumber *)getAvailableMemory:(NSError **)error
{
    mach_port_t host_port;
    mach_msg_type_number_t host_size;
    vm_size_t pagesize;

    host_port = mach_host_self();
    host_size = sizeof(vm_statistics_data_t) / sizeof(integer_t);
    host_page_size(host_port, &pagesize);        

    vm_statistics_data_t vm_stat;

    if (host_statistics(host_port, HOST_VM_INFO, (host_info_t)&vm_stat, &host_size) != KERN_SUCCESS)
    {
		if (error)
		{
			*error = [self kernelCallError:@"Failed to fetch vm statistics"];
		}
        return nil;
    }
    
    /* Stats in bytes */ 
    natural_t mem_free = vm_stat.free_count * pagesize;
    
    return @(mem_free);
}

- (void)getInfo:(CDVInvokedUrlCommand*)command
{
    [self.commandDelegate runInBackground:^{
        CDVPluginResult* pluginResult = nil;

        NSError* error = nil;

        NSNumber* capacity = [NSNumber numberWithUnsignedLongLong:[[NSProcessInfo processInfo] physicalMemory]];
        NSNumber* available = [self getAvailableMemory:&error];

        if (available)
        {
            NSDictionary* info = @{
                @"availableCapacity": available,
                @"capacity": capacity
            };

            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:info];
        }
        else
        {
            NSLog(@"Error occured while getting memory info - %@", [error localizedDescription]);
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Could not get memory info"];
        }

        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }];
}

@end
