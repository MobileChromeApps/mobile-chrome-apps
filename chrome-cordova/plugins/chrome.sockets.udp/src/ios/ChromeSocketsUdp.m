// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import "ChromeSocketsUdp.h"
#import "GCDAsyncUdpSocket.h"
#import <arpa/inet.h>
#import <ifaddrs.h>
#import <netdb.h>

#ifndef CHROME_SOCKETS_UDP_VERBOSE_LOGGING
#define CHROME_SOCKETS_UDP_VERBOSE_LOGGING 1
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

    GCDAsyncUdpSocket* _socket;

    NSMutableArray* _sendCallbacks;
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
        _persistent = [theProperties objectForKey:@"persistent"];
        _name = [theProperties objectForKey:@"name"];
        _bufferSize = [theProperties objectForKey:@"bufferSize"];

        // Set undefined properties to default value.
        if (_persistent == nil) _persistent = [NSNumber numberWithBool:false];
        if (_name == nil) _name = @"";
        if (_bufferSize == nil) _bufferSize = [NSNumber numberWithInteger:4096];

        _sendCallbacks = [NSMutableArray array];

        _socket = [[GCDAsyncUdpSocket alloc] initWithDelegate:self delegateQueue:dispatch_get_main_queue()];
        [_socket enableBroadcast:true error:nil];
    }
    return self;
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

    [_plugin fireReceiveEventsWithSocketId:_socketId data:data address:[GCDAsyncUdpSocket hostFromAddress:address]port:[GCDAsyncUdpSocket portFromAddress:address]];
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

- (void)create:(CDVInvokedUrlCommand*)command
{
    VERBOSE_LOG(@"receive create calls");

    NSDictionary* properties = [command argumentAtIndex:0];

    ChromeSocketsUdpSocket *socket = [[ChromeSocketsUdpSocket alloc] initWithId:_nextSocketId++ plugin:self properties:properties];
    [_sockets setObject:socket forKey:[NSNumber numberWithUnsignedInteger:socket->_socketId]];
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:socket->_socketId] callbackId:command.callbackId];

}

- (void)send:(CDVInvokedUrlCommand*)command
{
    VERBOSE_LOG(@"receive send calls");

    NSNumber* socketId = [command argumentAtIndex:0];
    NSString* address = [command argumentAtIndex:1];
    NSUInteger port = [[command argumentAtIndex:2] unsignedIntegerValue];
    NSData* data = [command argumentAtIndex:3];

    ChromeSocketsUdpSocket* socket = [_sockets objectForKey:socketId];

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

- (void)bind:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSString* address = [command argumentAtIndex:1];
    NSUInteger port = [[command argumentAtIndex:2] unsignedIntegerValue];

    if ([address isEqualToString:@"0.0.0.0"])
        address = nil;

    ChromeSocketsUdpSocket* socket = [_sockets objectForKey:socketId];

    NSError* err;
    BOOL success = (socket != nil) && [socket->_socket bindToPort:port interface:address error:&err];

    VERBOSE_LOG(@"NTFY %@.%@ Bind: %d", socketId, command.callbackId, success);

    if (success) {
        [socket->_socket beginReceiving:nil];
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
    } else {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsInt:[err code]] callbackId:command.callbackId];
    }
}

- (void)getInfo:(CDVInvokedUrlCommand *)command
{
    NSNumber* socketId = [command argumentAtIndex:0];

    ChromeSocketsUdpSocket* socket = [_sockets objectForKey:socketId];

    if (socket == nil) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR] callbackId:command.callbackId];
        return;
    }

    NSNumber* paused = [NSNumber numberWithBool:false];
    NSString* localAddress = [socket->_socket localHost];
    NSNumber* localPort = [NSNumber numberWithUnsignedInt:[socket->_socket localPort]];

    NSMutableDictionary* socketInfo = [@{
        @"socketId": socketId,
        @"persistent": socket->_persistent,
        @"name": socket->_name,
        @"bufferSize": socket->_bufferSize,
        @"paused": paused,
    } mutableCopy];

    if (localAddress) {
        [socketInfo setObject:localAddress forKey:@"localAddress"];
        [socketInfo setObject:localPort forKey:@"localPort"];
    }

    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:socketInfo] callbackId:command.callbackId];
}

- (void)registerReceiveEvents:(CDVInvokedUrlCommand*)command
{
    VERBOSE_LOG(@"registerReceiveEvents: ");
    _receiveEventsCallbackId = command.callbackId;
}

- (void)fireReceiveEventsWithSocketId:(NSUInteger)theSocketId data:(NSData*)theData address:(NSString*)theAddress port:(NSUInteger)thePort
{
    assert(_receiveEventsCallbackId != nil);

    // TODO(rui): truncated theData to the current buffer size.
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
