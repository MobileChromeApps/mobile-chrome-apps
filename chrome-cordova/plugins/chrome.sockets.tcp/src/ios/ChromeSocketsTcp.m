// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import "ChromeSocketsTcp.h"
#import "GCDAsyncSocket.h"

#ifndef CHROME_SOCKETS_TCP_VERBOSE_LOGGING
#define CHROME_SOCKETS_TCP_VERBOSE_LOGGING 0
#endif

#if CHROME_SOCKETS_TCP_VERBOSE_LOGGING
#define VERBOSE_LOG NSLog
#else
#define VERBOSE_LOG(args...) do {} while (false)
#endif

#if CHROME_SOCKETS_TCP_VERBOSE_LOGGING
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
#endif  // CHROME_SOCKETS_TCP_VERBOSE_LOGGING

#pragma mark ChromeSocketsTcpSocket interface

@interface ChromeSocketsTcpSocket : NSObject {
    @public
    __weak ChromeSocketsTcp* _plugin;
    
    NSUInteger _socketId;
    NSNumber* _persistent;
    NSString* _name;
    NSNumber* _bufferSize;
    
    NSUInteger _readTag;
    NSUInteger _receivedTag;
    
    NSNumber* _paused;
    NSMutableArray* _pausedBuffers;
    
    GCDAsyncSocket* _socket;
    
    NSMutableArray* _sendCallbacks;
    
    id _connectCallback;
    id _disconnectCallback;
}

@end

#pragma mark ChromeSocketsTcp interface

@interface ChromeSocketsTcp() {
    NSMutableDictionary* _sockets;
    NSUInteger _nextSocketId;
    NSString* _receiveEventsCallbackId;
}

@end

@implementation ChromeSocketsTcpSocket

- (ChromeSocketsTcpSocket*)initWithId:(NSUInteger)theSocketId plugin:(ChromeSocketsTcp*)thePlugin properties:(NSDictionary*)theProperties
{
    self = [super init];
    if (self) {
        _socketId = theSocketId;
        _plugin = thePlugin;
        _paused = [NSNumber numberWithBool:NO];
        _socket = [[GCDAsyncSocket alloc] initWithDelegate:self delegateQueue:dispatch_get_main_queue()];
        [self resetSocket];
        [self setProperties:theProperties];
    }
    return self;
}

- (ChromeSocketsTcpSocket*)initAcceptedSocketWithId:(NSUInteger)theSocketId plugin:(ChromeSocketsTcp*)thePlugin socket:(GCDAsyncSocket*)theSocket
{
    self = [super init];
    if (self) {
        _socketId = theSocketId;
        _plugin = thePlugin;
        _socket = theSocket;
        [_socket setDelegate:self];
        _paused = [NSNumber numberWithBool:YES];
        [self resetSocket];
        [self setProperties:nil];
    }
    return self;
}

- (void)resetSocket
{
    _readTag = 0;
    _receivedTag = 0;
    _pausedBuffers = [NSMutableArray array];
    _sendCallbacks = [NSMutableArray array];
    _connectCallback = nil;
    _disconnectCallback = nil;
}

- (NSDictionary*)getInfo
{
    NSString* localAddress = [_socket localHost];
    NSNumber* localPort = [NSNumber numberWithUnsignedInt:[_socket localPort]];
    NSString* peerAddress = [_socket connectedHost];
    NSNumber* peerPort = [NSNumber numberWithUnsignedInt:[_socket connectedPort]];
   
    NSMutableDictionary* socketInfo = [@{
        @"socketId": [NSNumber numberWithUnsignedInteger:_socketId],
        @"persistent": _persistent,
        @"name": _name,
        @"bufferSize": _bufferSize,
        @"connected": [NSNumber numberWithBool:[_socket isConnected]],
        @"paused": _paused,
    } mutableCopy];
    
    if (localAddress) {
        [socketInfo setObject:localAddress forKey:@"localAddress"];
        [socketInfo setObject:localPort forKey:@"localPort"];
    }
    
    if (peerAddress) {
        [socketInfo setObject:peerAddress forKey:@"peerAddress"];
        [socketInfo setObject:peerPort forKey:@"peerPort"];
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
    
    if (bufferSize && _bufferSize == 0 && ![_paused boolValue]) // read delegate method won't be called when _bufferSize == 0
        [_socket readDataWithTimeout:-1 buffer:nil bufferOffset:0 maxLength:[bufferSize unsignedIntegerValue] tag:_readTag++];
    
    if (bufferSize)
        _bufferSize = bufferSize;
    
    // Set undefined properties to default value
    if (_persistent == nil)
        _persistent = [NSNumber numberWithBool:NO];
    
    if (_name == nil)
        _name = @"";
    
    if (_bufferSize == nil)
        _bufferSize = [NSNumber numberWithUnsignedInteger:4096];
}

- (void)setPaused:(NSNumber*)paused
{
    if (![_paused isEqualToNumber:paused]) {
        _paused = paused;
        if (![_paused boolValue]) {
            for (NSData* data in _pausedBuffers) {
                [_plugin fireReceiveEventsWithSocketId:_socketId data:data];
            }
            if (_readTag == _receivedTag) {
                [_socket readDataWithTimeout:-1 buffer:nil bufferOffset:0 maxLength:[_bufferSize unsignedIntegerValue] tag:_readTag++];
            }
        }
    }
}

- (void)socket:(GCDAsyncSocket *)sock didConnectToHost:(NSString *)host port:(UInt16)port
{
    VERBOSE_LOG(@"socket:didConnectToHost socketId: %u", _socketId);
    
    void (^callback)(BOOL, NSInteger) = _connectCallback;
    assert(callback != nil);
    _connectCallback = nil;
    
    callback(YES, 0);
    
    [_socket readDataWithTimeout:-1 buffer:nil bufferOffset:0 maxLength:[_bufferSize unsignedIntegerValue] tag:_readTag++];
}

- (void)socket:(GCDAsyncSocket *)sock didReadData:(NSData *)data withTag:(long)tag
{
    VERBOSE_LOG(@"socket:didReadDataWithTag socketId: %u", _socketId);
    
    _receivedTag = tag;
    
    if ([_paused boolValue]) {
        [_pausedBuffers addObject:data];
    } else {
        [_plugin fireReceiveEventsWithSocketId:_socketId data:data];
        [_socket readDataWithTimeout:-1 buffer:nil bufferOffset:0 maxLength:[_bufferSize unsignedIntegerValue] tag:_readTag++];
    }
}

- (void)socket:(GCDAsyncSocket *)sock didWriteDataWithTag:(long)tag
{
    VERBOSE_LOG(@"socket:didWriteDataWithTag socketId: %u", _socketId);
    
    assert([_sendCallbacks count] != 0);
    void (^callback)() = [_sendCallbacks objectAtIndex:0];
    assert(callback != nil);
    [_sendCallbacks removeObjectAtIndex:0];

    callback();
}

- (void)socketDidDisconnect:(GCDAsyncSocket *)sock withError:(NSError *)err
{
    if (_disconnectCallback) {
        void (^callback)() = _disconnectCallback;
        assert(_disconnectCallback != nil);
        _disconnectCallback = nil;
        callback();
    } else if (err) {
        [_plugin fireReceiveErrorEventsWithSocketId:_socketId code:[err code]];
    }
    
    [self resetSocket];
}
@end

@implementation ChromeSocketsTcp

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super init];
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
    
    ChromeSocketsTcpSocket* socket = [[ChromeSocketsTcpSocket alloc] initWithId:_nextSocketId++ plugin:self properties:properties];
    
    [_sockets setObject:socket forKey:[NSNumber numberWithUnsignedInteger:socket->_socketId]];
    
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:socket->_socketId] callbackId:command.callbackId];
}

- (void)update:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSDictionary* properties = [command argumentAtIndex:1];
    
    ChromeSocketsTcpSocket *socket = [_sockets objectForKey:socketId];
    
    if (socket == nil)
        return;
    
    [socket setProperties:properties];
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
}

- (void)setPaused:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSNumber* paused = [command argumentAtIndex:1];
    
    ChromeSocketsTcpSocket* socket = [_sockets objectForKey:socketId];
    
    if (socket == nil)
        return;
    
    [socket setPaused:paused];
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
}

- (void)connect:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSString* peerAddress = [command argumentAtIndex:1];
    NSUInteger peerPort = [[command argumentAtIndex:2] unsignedIntegerValue];
    
    ChromeSocketsTcpSocket* socket = [_sockets objectForKey:socketId];
    
    if (socket == nil) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsInt:ENOTSOCK] callbackId:command.callbackId];
        return;
    }
   
    socket->_connectCallback = [^(BOOL success, NSInteger errCode) {
        if (success) {
            [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
        } else {
            [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsInt:errCode] callbackId:command.callbackId];
        }
    } copy];
    
    NSError* err;
    BOOL success = [socket->_socket connectToHost:peerAddress onPort:peerPort error:&err];
    if (!success) {
        void(^callback)(BOOL, NSInteger) = socket->_connectCallback;
        callback(NO, [err code]);
        socket->_connectCallback = nil;
    }
}

- (void)disconnectSocketWithId:(NSNumber*)socketId callbackId:(NSString*)theCallbackId close:(BOOL)close
{
     ChromeSocketsTcpSocket* socket = [_sockets objectForKey:socketId];
    
    if (socket == nil)
        return;

    socket->_disconnectCallback = [^(){
        if (theCallbackId)
            [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:theCallbackId];
        if (close)
            [_sockets removeObjectForKey:socketId];
    } copy];
    
    if ([socket->_socket isDisconnected]) {
        void (^callback)() = socket->_disconnectCallback;
        socket->_disconnectCallback = nil;
        callback();
    } else {
        [socket->_socket disconnectAfterReadingAndWriting];
    }      
}


- (void)disconnect:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    [self disconnectSocketWithId:socketId callbackId:command.callbackId close:NO];
}

- (void)send:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSData* data = [command argumentAtIndex:1];
    
    ChromeSocketsTcpSocket* socket = [_sockets objectForKey:socketId];
    
    if (socket == nil) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsInt:ENOTSOCK] callbackId:command.callbackId];
        return;
    }
   
    if ([socket->_socket isConnected]) {
        
        [socket->_sendCallbacks addObject:[^() {
            VERBOSE_LOG(@"ACK %@.%@ Write", socketId, command.callbackId);
            [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:[data length]] callbackId:command.callbackId];
        } copy]];
        
        [socket->_socket writeData:data withTimeout:-1 tag:-1];
        
    } else {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsInt:ENOTCONN] callbackId:command.callbackId];
    }
}

- (void)closeSocketWithId:(NSNumber*)socketId callbackId:(NSString*)theCallbackId
{
    [self disconnectSocketWithId:socketId callbackId:theCallbackId close:YES];
}

- (void)close:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    [self closeSocketWithId:socketId callbackId:command.callbackId];
}

- (void)getInfo:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    
    ChromeSocketsTcpSocket* socket = [_sockets objectForKey:socketId];
    
    if (socket == nil)
        return;
    
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:[socket getInfo]] callbackId:command.callbackId];
}

- (void)getSockets:(CDVInvokedUrlCommand*)command
{
    NSArray* sockets = [_sockets allValues];
    NSMutableArray* socketsInfo = [NSMutableArray arrayWithCapacity:[sockets count]];
    
    for (ChromeSocketsTcpSocket* socket in sockets) {
        [socketsInfo addObject:[socket getInfo]];
    }
    
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:socketsInfo] callbackId:command.callbackId];
}

- (void)registerReceiveEvents:(CDVInvokedUrlCommand*)command
{
    VERBOSE_LOG(@"registerReceiveEvents: ");
    _receiveEventsCallbackId = command.callbackId;
}

- (void)fireReceiveEventsWithSocketId:(NSUInteger)theSocketId data:(NSData*)theData
{
    assert(_receiveEventsCallbackId != nil);
    
    NSArray* info = @[
        [NSNumber numberWithUnsignedInteger:theSocketId],
        theData,
    ];
    
    CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsMultipart:info];
    [result setKeepCallbackAsBool:YES];
    
    [self.commandDelegate sendPluginResult:result callbackId:_receiveEventsCallbackId];
}

- (void)fireReceiveErrorEventsWithSocketId:(NSUInteger)theSocketId code:(NSInteger)theCode
{
    assert(_receiveEventsCallbackId != nil);
    
    NSDictionary* info = @{
        @"socketId": [NSNumber numberWithUnsignedInteger:theSocketId],
        @"resultCode": [NSNumber numberWithUnsignedInteger:theCode],
    };
    
    CDVPluginResult *result = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsDictionary:info];
    [result setKeepCallbackAsBool:YES];
    
    [self.commandDelegate sendPluginResult:result callbackId:_receiveEventsCallbackId];
}

- (NSUInteger)registerAcceptedSocket:(GCDAsyncSocket*)theSocket
{
    ChromeSocketsTcpSocket* socket = [[ChromeSocketsTcpSocket alloc] initAcceptedSocketWithId:_nextSocketId++ plugin:self socket:theSocket];
    [_sockets setObject:socket forKey:[NSNumber numberWithUnsignedInteger:socket->_socketId]];
    
    [socket setPaused:[NSNumber numberWithBool:YES]];
    
    return socket->_socketId;
}

@end