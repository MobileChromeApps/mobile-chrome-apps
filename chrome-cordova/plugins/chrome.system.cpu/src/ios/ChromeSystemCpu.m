// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import "ChromeSystemCpu.h"

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

@implementation ChromeSystemCpu

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];
    return self;
}

- (NSError *)throwSystemCallFailed:(NSString *)reason
{
	NSString *errMsg = [NSString stringWithUTF8String:strerror(errno)];

    NSException* myException = [NSException
                                exceptionWithName:@"InvalidOperationException"
                                reason:[NSString stringWithFormat:@"%@: %@", reason, errMsg]
                                userInfo:nil];
    @throw myException;
}

- (NSString*)getSysctlByName:(const char *)identifier
{
    size_t len;
    char *value;
    int ret;
    
    ret = sysctlbyname(identifier, NULL, &len, NULL, 0);
    if (ret != 0)
    {
        [self throwSystemCallFailed:[NSString stringWithFormat:@"sysctlbyname('%s') failed", identifier]];
    }

    value = malloc(len);
    ret = sysctlbyname(identifier, value, &len, NULL, 0);
    if (ret != 0)
    {
        [self throwSystemCallFailed:[NSString stringWithFormat:@"sysctlbyname('%s') failed", identifier]];
    }

    return @(value);
}

- (void)getCpuNames:(NSMutableDictionary*)info typeKey:(NSString*)typeKey subTypeKey:(NSString*)subTypeKey
{
    host_basic_info_data_t hinfo;
    mach_msg_type_number_t count;
    char *cpu_type_name, *cpu_subtype_name;
    
    count = HOST_BASIC_INFO_COUNT;
    kern_return_t kr = host_info(mach_host_self(),
                                 HOST_BASIC_INFO,
                                 (host_info_t)&hinfo,
                                 &count);
    
    if (kr != KERN_SUCCESS) {
        NSException* myException = [NSException
                                    exceptionWithName:@"InvalidOperationException"
                                    reason:@"Failed to retrieve host info"
                                    userInfo:nil];
        @throw myException;
    }
    
    
    // the slot_name() library function converts the specified
    // cpu_type/cpu_subtype pair to a human-readable form
    slot_name(hinfo.cpu_type, hinfo.cpu_subtype, &cpu_type_name,
              &cpu_subtype_name);
    
    [info setValue:@(cpu_type_name) forKey:typeKey];
    [info setValue:@(cpu_subtype_name) forKey:subTypeKey];
}

- (NSArray*)getCpuFeatures
{
    NSMutableArray* ret = [NSMutableArray array];
    // This key is not supported on iOS apparently (although it is for Mac)
    // NSString* allFeatures = [self getSysctlByName:"machdep.cpu.features"];
    // Have yet to find other way to determine cpu features
    return ret;
}

- (NSArray*)getCpuTimePerProcessor
{
    NSMutableArray* ret = [NSMutableArray array];

    processor_info_array_t cpuInfo;
    mach_msg_type_number_t numCpuInfo;    
    natural_t numCPUs = 0U;
    
    kern_return_t err = host_processor_info(mach_host_self(),
                                            PROCESSOR_CPU_LOAD_INFO,
                                            &numCPUs,
                                            &cpuInfo,
                                            &numCpuInfo);
    if (err != KERN_SUCCESS) {
        NSException* myException = [NSException
                exceptionWithName:@"InvalidOperationException"
                reason:@"Failed to retrieve host processor info"
                userInfo:nil];
        @throw myException;
    }

    for(unsigned i = 0U; i < numCPUs; ++i) {
        float user, kernel, idle, total;

        user = cpuInfo[(CPU_STATE_MAX * i) + CPU_STATE_USER];
        kernel = cpuInfo[(CPU_STATE_MAX * i) + CPU_STATE_SYSTEM];
        idle = cpuInfo[(CPU_STATE_MAX * i) + CPU_STATE_IDLE];
        total = user + kernel + idle + cpuInfo[(CPU_STATE_MAX * i) + CPU_STATE_NICE];

        NSMutableDictionary* procStat = [NSMutableDictionary dictionary];
        [procStat setValue:@(user) forKey:@"user"];
        [procStat setValue:@(kernel) forKey:@"kernel"];
        [procStat setValue:@(idle) forKey:@"idle"];
        [procStat setValue:@(total) forKey:@"total"];

        NSMutableDictionary* procUsage = [NSMutableDictionary dictionary];
        [procUsage setObject:procStat forKey:@"usage"];
    
        [ret addObject:procUsage];
    }

    return ret;
}
      
- (NSNumber*)getProcessorCount
{
    return [NSNumber numberWithInt:[[NSProcessInfo processInfo] processorCount]];
}

- (void)getInfo:(CDVInvokedUrlCommand*)command
{
    [self.commandDelegate runInBackground:^{
        CDVPluginResult* pluginResult = nil;

        @try {

            NSMutableDictionary* info = [NSMutableDictionary dictionary];

            NSArray* processors = [self getCpuTimePerProcessor];

            [self getCpuNames:info typeKey:@"archName" subTypeKey:@"modelName"];
            [info setObject:[self getCpuFeatures] forKey:@"features"];
            [info setObject:processors forKey:@"processors"];
            [info setValue:@([processors count]) forKey:@"numOfProcessors"];

            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:info];
        } @catch (NSException* exception) {
            VERBOSE_LOG(@"%@ - %@", @"Error occured while getting CPU info", [exception debugDescription]);
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Could not get CPU info"];
        }

        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }];
}

@end
