// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import "ChromeSocketsTcpServer.h"
#import "ChromeSocketsTcp.h"
#import "GCDAsyncSocket.h"
#import <sys/errno.h>

#ifndef CHROME_SOCKETS_TCP_SERVER_VERBOSE_LOGGING
#define CHROME_SOCKETS_TCP_SERVER_VERBOSE_LOGGING 0
#endif

#if CHROME_SOCKETS_TCP_SERVER_VERBOSE_LOGGING
#define VERBOSE_LOG NSLog
#else
#define VERBOSE_LOG(args...) do {} while (false)
#endif

#if CHROME_SOCKETS_TCP_SERVER_VERBOSE_LOGGING
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
#endif  // CHROME_SOCKETS_TCP_SERVER_VERBOSE_LOGGING

#pragma mark ChromeSocketsTcpServerSocket interface

@interface ChromeSocketsTcpServerSocket : NSObject {
    @public
    __weak ChromeSocketsTcpServer* _plugin;
    
    NSUInteger _socketId;
    NSNumber* _persistent;
    NSString* _name;
    NSNumber* _paused;
    NSMutableArray* _pausedBuffers;
    NSNumber* _backlog;
    GCDAsyncSocket* _socket;
    
    id _disconnectCallback;
}

@end

#pragma mark ChromeSocketsTcpServer interface

@interface ChromeSocketsTcpServer() {
    NSMutableDictionary* _sockets;
    NSUInteger _nextSocketId;
    NSString* _acceptEventsCallbackId;
}

@end

@implementation ChromeSocketsTcpServerSocket

- (ChromeSocketsTcpServerSocket*)initWithId:(NSUInteger)theSocketId plugin:(ChromeSocketsTcpServer*)thePlugin properties:(NSDictionary*)theProperties
{
    self = [super init];
    if (self) {
        _socketId = theSocketId;
        _plugin = thePlugin;
        _socket = [[GCDAsyncSocket alloc] initWithDelegate:self delegateQueue:dispatch_get_main_queue()];
        _paused = [NSNumber numberWithBool:NO];
        
        [self resetSocket];
        [self setProperties:theProperties];
    }
    return  self;
}

- (void)resetSocket
{
    _pausedBuffers = [NSMutableArray array];
    _disconnectCallback = nil;
    _backlog = [NSNumber numberWithInteger:0];
}

- (NSDictionary*)getInfo
{
    NSString* localAddress = [_socket localHost];
    NSNumber* localPort = [NSNumber numberWithUnsignedInteger:[_socket localPort]];
    
    NSMutableDictionary* socketInfo = [@{
        @"socketId": [NSNumber numberWithUnsignedInteger:_socketId],
        @"persistent": _persistent,
        @"name": _name,
        @"paused": _paused,
    } mutableCopy];
    
    if (localAddress) {
        socketInfo[@"localAddress"] = localAddress;
        socketInfo[@"localPort"] = localPort;
    }
    
    return [socketInfo copy];
}

- (void)setProperties:(NSDictionary*)theProperties
{
    NSNumber* persistent = theProperties[@"persistent"];
    NSString* name = theProperties[@"name"];
    
    if (persistent)
        _persistent = persistent;
    
    if (name)
        _name = name;
    
     // Set undefined properties to default value
    if (_persistent == nil)
        _persistent = [NSNumber numberWithBool:NO];
    
    if (_name == nil)
        _name = @"";
}

- (void)setPaused:(NSNumber*)paused
{
    if (![_paused isEqualToNumber:paused]) {
        _paused = paused;
        if (![_paused boolValue]) {
            for (GCDAsyncSocket* newSocket in _pausedBuffers) {
                [_plugin fireAcceptEventsWithSocketId:_socketId clientSocket:newSocket];
            }
        }
    }
}

- (void)socket:(GCDAsyncSocket *)sock didAcceptNewSocket:(GCDAsyncSocket *)newSocket
{
    if ([_paused boolValue]) {
        if ([_pausedBuffers count] < [_backlog integerValue]) {
            [_pausedBuffers addObject:newSocket];
        } else {
            [newSocket disconnect];
        }
    } else {
        [_plugin fireAcceptEventsWithSocketId:_socketId clientSocket:newSocket];
    }
}

- (void)socketDidDisconnect:(GCDAsyncSocket *)sock withError:(NSError *)err
{
    if (_disconnectCallback) {
        void (^callback)() = _disconnectCallback;
        assert(_disconnectCallback != nil);
        _disconnectCallback = nil;
        callback();
    } else if (err) {
        [_plugin fireAcceptErrorEventsWithSocketId:_socketId error:err];
    }
    
    [self resetSocket];
}

@end

@implementation ChromeSocketsTcpServer

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super init];
    if (self) {
        _sockets = [NSMutableDictionary dictionary];
        _nextSocketId = 0;
        _acceptEventsCallbackId = nil;
    }
    return self;
}

- (void)onReset
{
    for (NSNumber* socketId in _sockets) {
        [self closeSocketWithId:socketId callbackId:nil];
    }
}

- (NSDictionary*)buildErrorInfoWithErrorCode:(NSInteger)theErrorCode message:(NSString*)message
{
    return @{
        @"resultCode": [NSNumber numberWithInteger:theErrorCode],
        @"message": message,
    };
}

- (void)create:(CDVInvokedUrlCommand*)command
{
    NSDictionary* properties = [command argumentAtIndex:0];
    
    ChromeSocketsTcpServerSocket* socket = [[ChromeSocketsTcpServerSocket alloc] initWithId:_nextSocketId++ plugin:self properties:properties];
    
    _sockets[[NSNumber numberWithUnsignedInteger:socket->_socketId]] = socket;
    
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:socket->_socketId] callbackId:command.callbackId];
}

- (void)update:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSDictionary* properties = [command argumentAtIndex:1];
    
    ChromeSocketsTcpServerSocket* socket = _sockets[socketId];
    
    if (socket == nil)
        return;
    
    [socket setProperties:properties];
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
}

- (void)setPaused:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSNumber* paused = [command argumentAtIndex:1];
    
    ChromeSocketsTcpServerSocket* socket = _sockets[socketId];
    
    if (socket == nil)
        return;
    
    [socket setPaused:paused];
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
}

- (void)listen:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSString* address = [command argumentAtIndex:1];
    NSUInteger port = [[command argumentAtIndex:2] unsignedIntegerValue];
    NSNumber* backlog = [command argumentAtIndex:3];
    
    if ([address isEqualToString:@"0.0.0.0"])
        address = nil;
    
    ChromeSocketsTcpServerSocket* socket = _sockets[socketId];
    
    if (socket == nil) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsDictionary:[self buildErrorInfoWithErrorCode:ENOTSOCK message:@"Invalid Argument"]] callbackId:command.callbackId];
        return;
    }
    
    NSError* err;
    if ([socket->_socket acceptOnInterface:address port:port error:&err]) {
        
        if (backlog == nil) {
            socket->_backlog = [NSNumber numberWithInteger:SOMAXCONN];
        } else {
            socket->_backlog = backlog;
        }
        
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
    } else {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsDictionary:[self buildErrorInfoWithErrorCode:[err code] message:[err localizedDescription]]] callbackId:command.callbackId];
    }
}

- (void)disconnectSocketWithId:(NSNumber*)socketId callbackId:(NSString*)theCallbackId close:(BOOL)close
{
    ChromeSocketsTcpServerSocket* socket = _sockets[socketId];
    
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
    
    ChromeSocketsTcpServerSocket* socket = _sockets[socketId];
    
    if (socket == nil)
        return;
    
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:[socket getInfo]] callbackId:command.callbackId];
}

- (void)getSockets:(CDVInvokedUrlCommand*)command
{
    NSArray* sockets = [_sockets allValues];
    NSMutableArray* socketsInfo = [NSMutableArray arrayWithCapacity:[sockets count]];
    
    for (ChromeSocketsTcpServerSocket* socket in sockets) {
        [socketsInfo addObject:[socket getInfo]];
    }
    
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:socketsInfo] callbackId:command.callbackId];
}

- (void)registerAcceptEvents:(CDVInvokedUrlCommand*)command
{
    VERBOSE_LOG(@"registerAcceptEvents: ");
    _acceptEventsCallbackId = command.callbackId;
}

- (void)fireAcceptEventsWithSocketId:(NSUInteger)theSocketId clientSocket:(GCDAsyncSocket*)theClientSocket
{
    assert(_acceptEventsCallbackId != nil);
    
    ChromeSocketsTcp* tcpPlugin = [self.commandDelegate getCommandInstance:@"ChromeSocketsTcp"];
    NSUInteger clientSocketId = [tcpPlugin registerAcceptedSocket:theClientSocket];
    
    NSDictionary* info = @{
        @"socketId": [NSNumber numberWithUnsignedInteger:theSocketId],
        @"clientSocketId": [NSNumber numberWithUnsignedInteger:clientSocketId],
    };
    
    CDVPluginResult *result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:info];
    [result setKeepCallbackAsBool:YES];
    
    [self.commandDelegate sendPluginResult:result callbackId:_acceptEventsCallbackId];
}

- (void)fireAcceptErrorEventsWithSocketId:(NSUInteger)theSocketId error:(NSError*)theError
{
    assert(_acceptEventsCallbackId != nil);
    
    NSDictionary* info = @{
        @"socketId": [NSNumber numberWithUnsignedInteger:theSocketId],
        @"resultCode": [NSNumber numberWithUnsignedInteger:[theError code]],
        @"message": [theError localizedDescription],
    };
    
    CDVPluginResult *result = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsDictionary:info];
    [result setKeepCallbackAsBool:YES];
    
    [self.commandDelegate sendPluginResult:result callbackId:_acceptEventsCallbackId];
}

@end
