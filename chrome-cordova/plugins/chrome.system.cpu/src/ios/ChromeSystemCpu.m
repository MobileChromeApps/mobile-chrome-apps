// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import <Cordova/CDVPlugin.h>
#import <Foundation/Foundation.h>
#include <sys/sysctl.h>
#include <sys/types.h>
#include <mach/mach.h>
#include <mach/machine.h>
#include <mach/processor_info.h>
#include <mach/mach_host.h>

#if CHROME_SYSTEM_CPU_VERBOSE_LOGGING
#define VERBOSE_LOG NSLog
#else
#define VERBOSE_LOG(args...) do {} while (false)
#endif

@interface ChromeSystemCpu : CDVPlugin

- (void)getInfo:(CDVInvokedUrlCommand*)command;

@end

@implementation ChromeSystemCpu

- (NSError *)kernelCallError:(NSString *)errMsg
{
    int code = errno;
	NSString *codeDescription = [NSString stringWithUTF8String:strerror(code)];

	NSDictionary* userInfo = @{
                              NSLocalizedDescriptionKey: [NSString stringWithFormat:@"%@: %d - %@", errMsg, code, codeDescription]
                              };
	
	return [NSError errorWithDomain:NSPOSIXErrorDomain code:code userInfo:userInfo];
}

- (NSString*)getSysctlByName:(const char *)identifier error:(NSError **)errPtr
{
    size_t len = 0;

    int ret = sysctlbyname(identifier, NULL, &len, NULL, 0);
    if (ret != 0)
    {
		if (errPtr)
		{
			*errPtr = [self kernelCallError:[NSString stringWithFormat:@"sysctlbyname('%s') failed", identifier]];
		}
        return nil;
    }

    char *value = malloc(len);
    ret = sysctlbyname(identifier, value, &len, NULL, 0);
    if (ret != 0)
    {
		if (errPtr)
		{
			*errPtr = [self kernelCallError:[NSString stringWithFormat:@"sysctlbyname('%s') failed", identifier]];
		}
        free(value);
        return nil;
    }

    NSString* ctlValue = @(value);
    free(value);
    return ctlValue;
}

- (BOOL)getCpuNames:(NSString**)cpuType cpuSubType:(NSString**)cpuSubType error:(NSError **)errPtr
{
    host_basic_info_data_t hinfo;
    mach_msg_type_number_t count = HOST_BASIC_INFO_COUNT;
    
    kern_return_t kr = host_info(mach_host_self(),
                                 HOST_BASIC_INFO,
                                 (host_info_t)&hinfo,
                                 &count);
    
    if (kr != KERN_SUCCESS) {
		if (errPtr)
		{
			*errPtr = [self kernelCallError:@"Failed to retrieve host info"];
		}
		return NO;
    }
    
    
    // the slot_name() library function converts the specified
    // cpu_type/cpu_subtype pair to a human-readable form
    char* cpu_type_name = NULL;
    char* cpu_subtype_name = NULL;

    slot_name(hinfo.cpu_type, hinfo.cpu_subtype, &cpu_type_name,
              &cpu_subtype_name);
    
    *cpuType = @(cpu_type_name);
    *cpuSubType = @(cpu_subtype_name);
    
    return YES;
}

- (NSArray*)getCpuFeatures:(NSError **)errPtr
{
    NSMutableArray* features = [NSMutableArray array];
    // The sysctl key "machdep.cpu.features" is not supported on iOS (although it is for MacOS)
    /*NSString* allFeatures = [self getSysctlByName:"machdep.cpu.features" error:errPtr];
    if (!allFeatures)
    {
        return nil;
    }*/
    // Have yet to find other way to determine cpu features
    return features;
}

- (NSArray*)getCpuTimePerProcessor:(NSError **)errPtr
{
    NSMutableArray* procs = [NSMutableArray array];

    processor_info_array_t cpuInfo;
    mach_msg_type_number_t numCpuInfo;    
    natural_t numCPUs = 0U;
    
    kern_return_t kr = host_processor_info(mach_host_self(),
                                            PROCESSOR_CPU_LOAD_INFO,
                                            &numCPUs,
                                            &cpuInfo,
                                            &numCpuInfo);
    if (kr != KERN_SUCCESS) {
		if (errPtr)
		{
			*errPtr = [self kernelCallError:@"Failed to retrieve host processor info"];
		}
		return nil;
    }

    for(natural_t i = 0U; i < numCPUs; ++i) {

        float user = cpuInfo[(CPU_STATE_MAX * i) + CPU_STATE_USER];
        float kernel = cpuInfo[(CPU_STATE_MAX * i) + CPU_STATE_SYSTEM];
        float idle = cpuInfo[(CPU_STATE_MAX * i) + CPU_STATE_IDLE];
        float total = user + kernel + idle + cpuInfo[(CPU_STATE_MAX * i) + CPU_STATE_NICE];

        NSDictionary* procStat = @{
                                   @"user": @(user),
                                   @"kernel": @(kernel),
                                   @"idle": @(idle),
                                   @"total": @(total)
                                   };

        [procs addObject:@{
                           @"usage": procStat
                           }];
    }

    return procs;
}
      
- (NSDictionary*)_getInfo:(NSError **)errPtr
{
    NSArray* processors = [self getCpuTimePerProcessor:errPtr];

    if (processors == nil) {
        return nil;
    }

    NSArray* features = [self getCpuFeatures:errPtr];

    if (features == nil) {
        return nil;
    }

    NSString* archName;
    NSString* modelName;
    if (![self getCpuNames:&archName cpuSubType:&modelName error:errPtr])
    {
        return nil;
    }

    return @{
             @"archName": archName,
             @"modelName": modelName,
             @"features": features,
             @"processors": processors,
             @"numOfProcessors": @([processors count])
             };
}

- (void)getInfo:(CDVInvokedUrlCommand*)command
{
    [self.commandDelegate runInBackground:^{
        CDVPluginResult* pluginResult = nil;

        NSError* err = nil;
        NSDictionary* info = [self _getInfo:&err];
        
        if (info)
        {
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:info];
        }
        else
        {
            NSLog(@"Error occured while getting CPU info - %@", [err localizedDescription]);
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Could not get CPU info"];
        }

        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }];
}

@end
