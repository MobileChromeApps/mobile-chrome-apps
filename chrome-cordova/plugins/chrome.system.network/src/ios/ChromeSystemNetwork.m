// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import <Cordova/CDVPlugin.h>
#import <Foundation/Foundation.h>
#import <sys/types.h>
#import <ifaddrs.h> // For getifaddrs()
#import <net/if.h> // For IFF_LOOPBACK
#import <netinet/in.h> // For sockaddr_in
#import <arpa/inet.h> // For inet_ntop

#if CHROME_SYSTEM_NETWORK_VERBOSE_LOGGING
#define VERBOSE_LOG NSLog
#else
#define VERBOSE_LOG(args...) do {} while (false)
#endif

@interface ChromeSystemNetwork : CDVPlugin

- (void)getNetworkInterfaces:(CDVInvokedUrlCommand*)command;

@end

@implementation ChromeSystemNetwork

- (NSError *)kernelCallError:(NSString *)errMsg
{
    int code = errno;
	NSString *codeDescription = [NSString stringWithUTF8String:strerror(code)];

	NSDictionary* userInfo = @{
                              NSLocalizedDescriptionKey: [NSString stringWithFormat:@"%@: %d - %@", errMsg, code, codeDescription]
                              };

	return [NSError errorWithDomain:NSPOSIXErrorDomain code:code userInfo:userInfo];
}

- (NSString*)getIPAddress:(struct sockaddr *)ifa_addr family:(sa_family_t)family
{
    // IP address has different data structure, for IPv4 vs IPv6
    void* addressPointer = NULL;
    char addressBuffer[100];

    if (family == AF_INET6)
    {
        addressPointer = &((struct sockaddr_in6 *)ifa_addr)->sin6_addr;
    }
    else
    {
        addressPointer = &((struct sockaddr_in *)ifa_addr)->sin_addr;
    }
    inet_ntop(family, addressPointer, (char*)&addressBuffer, sizeof(addressBuffer));

    NSString* address = [NSString stringWithUTF8String:addressBuffer];

    // Strip address scope zones for IPv6 address.
    if (family == AF_INET6)
    {
        NSRange range = [address rangeOfString:@"%"];
        if (range.location != NSNotFound)
        {
            address = [address substringToIndex:range.location];
        }
    }

    return address;
}

-(unsigned int)getPrefixLength:(struct sockaddr *)ifa_netmask family:(sa_family_t)family
{
    if (ifa_netmask == NULL)
    {
        return 0;
    }

    unsigned int prefixLength = 0;

    // Compute the network prefix length by using the "address" of the net mask
    //  - Count all the most significant bits that are set in the address
    //  - The count stops as soon as a zero bit is found
    //  - Approach is same for IPv4 vs IPv6, differs in implementation due to
    //    different data structures for larger IPv6 addresses (32 vs 128 bit)
    if (family == AF_INET6)
    {
        struct in6_addr address = ((struct sockaddr_in6 *)ifa_netmask)->sin6_addr;

        // Count all the set bits in the 16 bytes of the IPv6 address
        for (int i = 0; i < 16; i++) {
            u_int8_t mask_part = address.s6_addr[i];

            while ( mask_part & 0x80 ) {
                prefixLength++;
                mask_part <<= 1;
            }
        }
    }
    else
    {
        struct in_addr address = ((struct sockaddr_in *)ifa_netmask)->sin_addr;
        uint32_t subnet_mask = ntohl( address.s_addr );

        // Count all the set bits in the 32 bit IPv4 address
        while ( subnet_mask & 0x80000000 ) {
          prefixLength++;
          subnet_mask <<= 1;
        }
    }

    return prefixLength;
}

- (NSArray*)_getNetworkInterfaces:(NSError **)error
{
    struct ifaddrs* interfaces = NULL;

    // retrieve the current interfaces - returns 0 on success
    if (getifaddrs(&interfaces) != 0)
    {
		if (error)
		{
			*error = [self kernelCallError:@"Failed to getifaddrs"];
		}
        return nil;
    }

    NSMutableArray* ret = [NSMutableArray array];
    struct ifaddrs* temp_addr = NULL;

    // Loop through linked list of interfaces
    for (temp_addr = interfaces; temp_addr != NULL; temp_addr = temp_addr->ifa_next)
    {
        if (temp_addr->ifa_flags & IFF_LOOPBACK)
        {
            // Ignore the loopback address
            continue;
        }

        sa_family_t family = (temp_addr->ifa_addr ? temp_addr->ifa_addr->sa_family : 0);
        if (family != AF_INET &&
            family != AF_INET6)
        {
            // Ignore non-Internet interfaces
            continue;
        }

        NSString* name = [NSString stringWithUTF8String:temp_addr->ifa_name];

        NSString* address = [self getIPAddress:temp_addr->ifa_addr family:family];

        unsigned int prefixLength = [self getPrefixLength:temp_addr->ifa_netmask family:family];

        VERBOSE_LOG(@"interface name: %@; address: %@; prefixLength: %d", name, address, prefixLength);

        [ret addObject:@{
                         @"name": name,
                         @"address": address,
                         @"prefixLength": @(prefixLength)
                         }];
    }

    // Free memory
    freeifaddrs(interfaces);

    return ret;
}

- (void)getNetworkInterfaces:(CDVInvokedUrlCommand*)command
{
    [self.commandDelegate runInBackground:^{
        CDVPluginResult* pluginResult = nil;

        NSError* error = nil;
        NSArray* interfaces = [self _getNetworkInterfaces:&error];

        if (interfaces)
        {
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:interfaces];
        }
        else
        {
            NSLog(@"Error occured while getting network interfaces - %@", [error localizedDescription]);
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Could not get network interfaces"];
        }

        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }];
}

@end
