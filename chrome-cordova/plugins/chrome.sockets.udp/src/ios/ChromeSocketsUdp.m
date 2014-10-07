// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import "ChromeSocketsUdp.h"
#import "GCDAsyncUdpSocket.h"
#import <arpa/inet.h>
#import <ifaddrs.h>
#import <netdb.h>

#ifndef CHROME_SOCKETS_UDP_VERBOSE_LOGGING
#define CHROME_SOCKETS_UDP_VERBOSE_LOGGING 0
#endif

#if CHROME_SOCKETS_UDP_VERBOSE_LOGGING
#define VERBOSE_LOG NSLog
#else
#define VERBOSE_LOG(args...) do {} while (false)
#endif

#if CHROME_SOCKETS_UDP_VERBOSE_LOGGING
static NSString* stringFromData(NSData* data) {
    NSUInteger len = [data length];
    if (len > 200) {
        len = 200;
    }
    char* buf = (char*)malloc(len + 1);
    memcpy(buf, [data bytes], len);
    buf[len] = 0;
    NSString* ret = [NSString stringWithUTF8String:buf];
    free(buf);
    return ret;
}
#endif  // CHROME_SOCKETS_UDP_VERBOSE_LOGGING

#pragma mark ChromeSocketsUdpSocket interface

@interface ChromeSocketsUdpSocket : NSObject {
    @public
    __weak ChromeSocketsUdp* _plugin;

    NSUInteger _socketId;
    NSNumber* _persistent;
    NSString* _name;
    NSNumber* _bufferSize;
    NSNumber* _paused;
    
    GCDAsyncUdpSocket* _socket;

    NSMutableArray* _sendCallbacks;
    
    id _closeCallback;
    
    NSMutableSet* _multicastGroups;
}
@end

#pragma mark ChromeSocketsUdp interface

@interface ChromeSocketsUdp() {
    NSMutableDictionary* _sockets;
    NSUInteger _nextSocketId;
    NSString* _receiveEventsCallbackId;
}
@end

@implementation ChromeSocketsUdpSocket

- (ChromeSocketsUdpSocket*)initWithId:(NSUInteger)theSocketId plugin:(ChromeSocketsUdp*)thePlugin properties:(NSDictionary*)theProperties
{
    self = [super init];
    if (self) {
        _socketId = theSocketId;
        _plugin = thePlugin;
        _paused = [NSNumber numberWithBool:NO];
        
        _sendCallbacks = [NSMutableArray array];
        _closeCallback = nil;
        
        _socket = [[GCDAsyncUdpSocket alloc] initWithDelegate:self delegateQueue:dispatch_get_main_queue()];
       
        [_socket enableBroadcast:YES error:nil];
        _multicastGroups = [NSMutableSet set];
        
        [self setProperties:theProperties];
    }
    return self;
}

- (NSDictionary*)getInfo
{
    NSString* localAddress = [_socket localHost];
    NSNumber* localPort = [NSNumber numberWithUnsignedInt:[_socket localPort]];

    NSMutableDictionary* socketInfo = [@{
        @"socketId": [NSNumber numberWithUnsignedInteger:_socketId],
        @"persistent": _persistent,
        @"name": _name,
        @"bufferSize": _bufferSize,
        @"paused": _paused,
    } mutableCopy];

    if (localAddress) {
        [socketInfo setObject:localAddress forKey:@"localAddress"];
        [socketInfo setObject:localPort forKey:@"localPort"];
    }
    
    return [socketInfo copy];
}

- (void)setProperties:(NSDictionary*)theProperties
{
    NSNumber* persistent = [theProperties objectForKey:@"persistent"];
    NSString* name = [theProperties objectForKey:@"name"];
    NSNumber* bufferSize = [theProperties objectForKey:@"bufferSize"];

    if (persistent)
        _persistent = persistent;
    
    if (name)
        _name = name;
    
    if (bufferSize)
        _bufferSize = bufferSize;
    
    // Set undefined properties to default value.
    if (_persistent == nil)
        _persistent = [NSNumber numberWithBool:NO];
    
    if (_name == nil)
        _name = @"";
    
    if (_bufferSize == nil)
        _bufferSize = [NSNumber numberWithInteger:4096];
    
    if ([_socket isIPv4]) {
        if ([_bufferSize integerValue] > UINT16_MAX) {
           [_socket setMaxReceiveIPv4BufferSize:UINT16_MAX];
        } else {
            [_socket setMaxReceiveIPv4BufferSize:[_bufferSize integerValue]];
        }
    }
    
    if ([_socket isIPv6]) {
        if ([bufferSize integerValue] > UINT32_MAX) {
            [_socket setMaxReceiveIPv6BufferSize:UINT32_MAX];
        } else {
            [_socket setMaxReceiveIPv6BufferSize:[_bufferSize integerValue]];
        }
    }
}

- (void)setPaused:(NSNumber*)paused
{
    if (![_paused isEqualToNumber:paused]) {
        _paused = paused;
        if ([_paused boolValue]) {
            [_socket pauseReceiving];
        } else {
            [_socket beginReceiving:nil];
        }
    }
}

- (void)udpSocket:(GCDAsyncUdpSocket*)sock didSendDataWithTag:(long)tag
{
    VERBOSE_LOG(@"udpSocket:didSendDataWithTag socketId: %u", _socketId);

    assert([_sendCallbacks count] != 0);
    void (^ callback)(BOOL, NSInteger) = [_sendCallbacks objectAtIndex:0];
    assert(callback != nil);
    [_sendCallbacks removeObjectAtIndex:0];

    callback(YES, 0);
}

- (void)udpSocket:(GCDAsyncUdpSocket*)sock didNotSendDataWithTag:(long)tag dueToError:(NSError *)error
{
    VERBOSE_LOG(@"udpSocket:didNotSendDataWithTag socketId: %u", _socketId);

    assert([_sendCallbacks count] != 0);
    void (^ callback)(BOOL, NSInteger) = [_sendCallbacks objectAtIndex:0];
    assert(callback != nil);
    [_sendCallbacks removeObjectAtIndex:0];

    callback(NO, [error code]);
}

- (void)udpSocket:(GCDAsyncUdpSocket *)sock didReceiveData:(NSData *)data fromAddress:(NSData *)address withFilterContext:(id)filterContext
{
    VERBOSE_LOG(@"udbSocket:didReceiveData socketId: %u", _socketId);
    
    [_plugin fireReceiveEventsWithSocketId:_socketId data:data address:[GCDAsyncUdpSocket hostFromAddress:address] port:[GCDAsyncUdpSocket portFromAddress:address]];
}

- (void)udpSocketDidClose:(GCDAsyncUdpSocket *)sock withError:(NSError *)error
{
    VERBOSE_LOG(@"udbSocketDidClose:withError socketId: %u", _socketId);
    assert(_closeCallback != nil);
    void (^callback)() = _closeCallback;
    _closeCallback = nil;
    
    callback();
}
@end

@implementation ChromeSocketsUdp

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];
    if (self) {
        _sockets = [NSMutableDictionary dictionary];
        _nextSocketId = 0;
        _receiveEventsCallbackId = nil;
    }
    return self;
}

- (void)onReset
{
    for (NSNumber* socketId in _sockets) {
        [self closeSocketWithId:socketId callbackId:nil];
    }
}

- (void)create:(CDVInvokedUrlCommand*)command
{
    NSDictionary* properties = [command argumentAtIndex:0];

    ChromeSocketsUdpSocket *socket = [[ChromeSocketsUdpSocket alloc] initWithId:_nextSocketId++ plugin:self properties:properties];
    [_sockets setObject:socket forKey:[NSNumber numberWithUnsignedInteger:socket->_socketId]];
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:socket->_socketId] callbackId:command.callbackId];
}

- (void)update:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSDictionary* properties = [command argumentAtIndex:1];
    
    ChromeSocketsUdpSocket *socket = [_sockets objectForKey:socketId];
    
    if (socket == nil)
        return;
    
    [socket setProperties:properties];
    
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
}

- (void)setPaused:(CDVInvokedUrlCommand *)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSNumber* paused = [command argumentAtIndex:1];
    
    ChromeSocketsUdpSocket* socket = [_sockets objectForKey:socketId];

    if (socket == nil)
        return;
    
    [socket setPaused:paused];
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
}

- (void)bind:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSString* address = [command argumentAtIndex:1];
    NSUInteger port = [[command argumentAtIndex:2] unsignedIntegerValue];

    if ([address isEqualToString:@"0.0.0.0"])
        address = nil;

    ChromeSocketsUdpSocket* socket = [_sockets objectForKey:socketId];

    if (socket == nil) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsInt:ENOTSOCK] callbackId:command.callbackId];
        return;
    }
    
    NSError* err;
    if ([socket->_socket bindToPort:port interface:address error:&err]) {
        
        VERBOSE_LOG(@"NTFY %@.%@ Bind", socketId, command.callbackId);
        
        if (![socket->_paused boolValue])
            [socket->_socket beginReceiving:nil];
        
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
    } else {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsInt:[err code]] callbackId:command.callbackId];
    }
}

- (void)send:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSString* address = [command argumentAtIndex:1];
    NSUInteger port = [[command argumentAtIndex:2] unsignedIntegerValue];
    NSData* data = [command argumentAtIndex:3];

    ChromeSocketsUdpSocket* socket = [_sockets objectForKey:socketId];
   
    if (socket == nil) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsInt:ENOTSOCK] callbackId:command.callbackId];
        return;
    }
  
    [socket->_sendCallbacks addObject:[^(BOOL success, NSInteger errCode) {
        VERBOSE_LOG(@"ACK %@.%@ Write: %d", socketId, command.callbackId, success);

        if (success) {
            [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:[data length]] callbackId:command.callbackId];
        } else {
            [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsInt:errCode] callbackId:command.callbackId];
        }
    } copy]];

    [socket->_socket sendData:data toHost:address port:port withTimeout:-1 tag:-1];
}

- (void)closeSocketWithId:(NSNumber*)socketId callbackId:(NSString*)theCallbackId
{
    ChromeSocketsUdpSocket* socket = [_sockets objectForKey:socketId];

    if (socket == nil)
        return;
  
    socket->_closeCallback = [^() {
        if (theCallbackId)
            [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:theCallbackId];
        
        [_sockets removeObjectForKey:socketId];
    } copy];
   
    if ([socket->_socket isClosed]) {
        void(^callback)() = socket->_closeCallback;
        socket->_closeCallback = nil;
        callback();
    } else {
        [socket->_socket closeAfterSending];
    }
}

- (void)close:(CDVInvokedUrlCommand *)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    [self closeSocketWithId:socketId callbackId:command.callbackId];
}

- (void)getInfo:(CDVInvokedUrlCommand *)command
{
    NSNumber* socketId = [command argumentAtIndex:0];

    ChromeSocketsUdpSocket* socket = [_sockets objectForKey:socketId];

    if (socket == nil)
        return;

    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:[socket getInfo]] callbackId:command.callbackId];
}

- (void)getSockets:(CDVInvokedUrlCommand *)command
{
    NSArray* sockets = [_sockets allValues];
    NSMutableArray* socketsInfo = [NSMutableArray arrayWithCapacity:[sockets count]];
    
    for (ChromeSocketsUdpSocket* socket in sockets) {
        [socketsInfo addObject: [socket getInfo]];
    }
    
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:socketsInfo] callbackId:command.callbackId];
}

- (void)joinGroup:(CDVInvokedUrlCommand *)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSString* address = [command argumentAtIndex:1];
    
    ChromeSocketsUdpSocket* socket = [_sockets objectForKey:socketId];
    if (socket == nil || [socket->_multicastGroups containsObject:address]) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsInt:ENOTSOCK] callbackId:command.callbackId];
        return;
    }
    
    VERBOSE_LOG(@"REQ %@.%@ joinGroup", socketId, command.callbackId);
    
    NSError* err;
    if ([socket->_socket joinMulticastGroup:address error:&err]) {
        [socket->_multicastGroups addObject:address];
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
    } else {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsInt:[err code]] callbackId:command.callbackId];
    }
}

- (void)leaveGroup:(CDVInvokedUrlCommand *)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSString* address = [command argumentAtIndex:1];
    
    ChromeSocketsUdpSocket* socket = [_sockets objectForKey:socketId];
    if (socket == nil || ![socket->_multicastGroups containsObject:address]) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsInt:ENOTSOCK] callbackId:command.callbackId];
        return;
    }
   
    VERBOSE_LOG(@"REQ %@.%@ leaveGroup", socketId, command.callbackId);
    
    NSError* err;
    if ([socket->_socket leaveMulticastGroup:address error:&err]) {
        [socket->_multicastGroups removeObject:address];
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
    } else {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsInt:[err code]] callbackId:command.callbackId];
    }
}

- (void)setMulticastTimeToLive:(CDVInvokedUrlCommand *)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSNumber* ttl = [command argumentAtIndex:1];
    
    ChromeSocketsUdpSocket* socket = [_sockets objectForKey:socketId];
    if (socket == nil) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsInt:ENOTSOCK] callbackId:command.callbackId];
        return;
    }
    
    VERBOSE_LOG(@"REQ %@.%@ setMulticastTimeToLive", socketId, command.callbackId);
   
    [socket->_socket performBlock:^{
        
        if ([socket->_socket isIPv4]) {
            unsigned char ttlCpy = [ttl intValue];
            if (setsockopt([socket->_socket socket4FD], IPPROTO_IP, IP_MULTICAST_TTL, &ttlCpy, sizeof(ttlCpy)) < 0) {
                [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsInt:errno] callbackId:command.callbackId];
            }
        }
        
        if ([socket->_socket isIPv6]) {
            int ttlCpy = [ttl intValue];
            if (setsockopt([socket->_socket socket6FD], IPPROTO_IPV6, IP_MULTICAST_TTL, &ttlCpy, sizeof(ttlCpy)) < 0) {
                [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsInt:errno] callbackId:command.callbackId];
            }
        }
        
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
    }];
}

- (void)setMulticastLoopbackMode:(CDVInvokedUrlCommand *)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSNumber* enabled = [command argumentAtIndex:1];
    
    ChromeSocketsUdpSocket* socket = [_sockets objectForKey:socketId];
    
    if (socket == nil) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsInt:ENOTSOCK] callbackId:command.callbackId];
        return;
    }

    VERBOSE_LOG(@"REQ %@.%@ setMulticastLoopbackMode", socketId, command.callbackId);
    
    [socket->_socket performBlock:^{

        if ([socket->_socket isIPv4]) {
            unsigned char loop = [enabled intValue];
            if (setsockopt([socket->_socket socketFD], IPPROTO_IP, IP_MULTICAST_LOOP, &loop, sizeof(loop)) < 0) {
                [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsInt:errno] callbackId:command.callbackId];
            }
        }
        
        if ([socket->_socket isIPv6]) {
            int loop = [enabled intValue];
            if (setsockopt([socket->_socket socket6FD], IPPROTO_IPV6, IP_MULTICAST_LOOP, &loop, sizeof(loop)) < 0) {
                [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsInt:errno] callbackId:command.callbackId];
            }
        }
        
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
    }];
}

- (void)getJoinedGroups:(CDVInvokedUrlCommand *)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    
    ChromeSocketsUdpSocket* socket = [_sockets objectForKey:socketId];
    if (socket == nil)
        return;
    
    VERBOSE_LOG(@"REQ %@.%@ getJoinedGroups", socketId, command.callbackId);
    
    NSArray *ret = [socket->_multicastGroups allObjects];
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:ret] callbackId:command.callbackId];
}

- (void)registerReceiveEvents:(CDVInvokedUrlCommand*)command
{
    VERBOSE_LOG(@"registerReceiveEvents: ");
    _receiveEventsCallbackId = command.callbackId;
}

- (void)fireReceiveEventsWithSocketId:(NSUInteger)theSocketId data:(NSData*)theData address:(NSString*)theAddress port:(NSUInteger)thePort
{
    assert(_receiveEventsCallbackId != nil);

    NSArray *info = @[
        [NSNumber numberWithUnsignedInteger:theSocketId],
        theData,
        theAddress,
        [NSNumber numberWithInteger:thePort],
    ];

    CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsMultipart:info];
    [result setKeepCallbackAsBool:YES];

    [self.commandDelegate sendPluginResult:result callbackId:_receiveEventsCallbackId];
}

@end
