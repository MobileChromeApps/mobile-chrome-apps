// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import "ChromeSocket.h"
#import "GCDAsyncSocket.h"
#import "GCDAsyncUdpSocket.h"
#import <arpa/inet.h>
#import <netdb.h>

#ifndef CHROME_SOCKET_VERBOSE_LOGGING
#define CHROME_SOCKET_VERBOSE_LOGGING 0
#endif

#if CHROME_SOCKET_VERBOSE_LOGGING
#define VERBOSE_LOG NSLog
#else
#define VERBOSE_LOG(args...) do {} while (false)
#endif

#if CHROME_SOCKET_VERBOSE_LOGGING
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
#endif  // CHROME_SOCKET_VERBOSE_LOGGING



#pragma mark ChromeSocketSocket interface

/*
 * A note about the name ChromeSocketSocket:  ChromeSocket is the name of the plugin, and we need an internal
 * representation of a Socket, hense ChromeSocket..Socket
 */
@interface ChromeSocketSocket : NSObject {
    @public
    __weak ChromeSocket* _plugin;

    NSUInteger _socketId;
    NSString* _mode;
    id _socket;

    id _connectCallback;
    id _acceptCallback;
    NSMutableArray* _readCallbacks;
    NSMutableArray* _writeCallbacks;

    NSMutableArray* _acceptSocketQueue;

    NSMutableSet* _multiCastGroups;
}
@end



#pragma mark ChromeSocket interface

@interface ChromeSocket () {
    NSMutableDictionary* _sockets;
    NSUInteger _nextSocketId;
}
- (ChromeSocketSocket*) createNewSocketWithMode:(NSString*)mode socket:(id)theSocket;
@end



#pragma mark ChromeSocketSocket implementation

@implementation ChromeSocketSocket

- (ChromeSocketSocket*)initWithId:(NSUInteger)theSocketId mode:(NSString*)theMode plugin:(ChromeSocket*)thePlugin socket:theSocket
{
    self = [super init];
    if (self) {
        _socketId = theSocketId;
        _mode = theMode;
        _plugin = thePlugin;

        _readCallbacks = [NSMutableArray array];
        _writeCallbacks = [NSMutableArray array];
        _acceptSocketQueue = [NSMutableArray array];
        _multiCastGroups = [NSMutableSet set];

        if (theSocket == nil) {
            if ([_mode isEqualToString:@"tcp"]) {
                theSocket = [[GCDAsyncSocket alloc] initWithDelegate:self delegateQueue:dispatch_get_main_queue()];
            } else {
                theSocket = [[GCDAsyncUdpSocket alloc] initWithDelegate:self delegateQueue:dispatch_get_main_queue()];
                [theSocket enableBroadcast:true error:nil];
            }
        } else {
            [theSocket setDelegate:self];
        }

        _socket = theSocket;
    }
    return self;
}

- (void)dealloc
{
    if (_socket != nil) {
        // TODO: make sure we disconnect/destroy on cleanup.  This may already be guarenteed.
    }
}


- (void)socket:(GCDAsyncSocket*)sock didConnectToHost:(NSString *)host port:(UInt16)thePort
{
    VERBOSE_LOG(@"socket:didConnectToHost socketId: %u", _socketId);

    void (^ callback)(BOOL) = _connectCallback;
    assert(callback != nil);
    _connectCallback = nil;

    callback(YES);
}



- (void)udpSocket:(GCDAsyncUdpSocket *)sock didConnectToAddress:(NSData *)address
{
    VERBOSE_LOG(@"udpSocket:didConnectToAddress socketId: %u", _socketId);

    void (^ callback)(BOOL) = _connectCallback;
    assert(callback != nil);
    _connectCallback = nil;

    callback(YES);
}

- (void)udpSocket:(GCDAsyncUdpSocket *)sock didNotConnect:(NSError *)error
{
    VERBOSE_LOG(@"udpSocket:didNotConnect socketId: %u", _socketId);

    void (^ callback)(BOOL) = _connectCallback;
    assert(callback != nil);
    _connectCallback = nil;

    callback(NO);
}

- (void)socket:(GCDAsyncSocket*)sock didAcceptNewSocket:(id)newSocket
{
    VERBOSE_LOG(@"socket:didAcceptNewSocket socketId: %u", _socketId);

    ChromeSocketSocket* socket = [_plugin createNewSocketWithMode:_mode socket:newSocket];

    void (^ callback)(NSUInteger socketId) = _acceptCallback;
    _acceptCallback = nil;

    if (callback != nil) {
        callback(socket->_socketId);
    } else {
        [_acceptSocketQueue addObject:socket];
    }
}

- (void)socketDidDisconnect:(GCDAsyncSocket*)sock withError:(NSError *)error
{
    VERBOSE_LOG(@"socketDidDisconnect socketId: %u", _socketId);

    void (^ callback)(BOOL) = _connectCallback;

    if (callback == nil)
        return;
    _connectCallback = nil;

    callback(NO);
}

- (void)udpSocketDidClose:(GCDAsyncUdpSocket *)sock withError:(NSError *)error
{
    VERBOSE_LOG(@"udpSocketDidClose socketId: %u", _socketId);
}

- (void)socket:(GCDAsyncSocket*)sock didWriteDataWithTag:(long)tag
{
    VERBOSE_LOG(@"socket:didWriteDataWithTag socketId: %u", _socketId);

    assert([_writeCallbacks count] != 0);
    void (^ callback)(BOOL) = [_writeCallbacks objectAtIndex:0];
    assert(callback != nil);
    [_writeCallbacks removeObjectAtIndex:0];

    callback(YES);
}

- (void)udpSocket:(GCDAsyncUdpSocket *)sock didSendDataWithTag:(long)tag
{
    VERBOSE_LOG(@"udpSocket:didSendDataWithTag socketId: %u", _socketId);

    assert([_writeCallbacks count] != 0);
    void (^ callback)(BOOL) = [_writeCallbacks objectAtIndex:0];
    assert(callback != nil);
    [_writeCallbacks removeObjectAtIndex:0];

    callback(YES);
}

- (void)udpSocket:(GCDAsyncUdpSocket *)sock didNotSendDataWithTag:(long)tag dueToError:(NSError *)error
{
    VERBOSE_LOG(@"udpSocket:didNotSendDataWithTag socketId: %u", _socketId);

    assert([_writeCallbacks count] != 0);
    void (^ callback)(BOOL) = [_writeCallbacks objectAtIndex:0];
    assert(callback != nil);
    [_writeCallbacks removeObjectAtIndex:0];

    callback(NO);
}

- (void)socket:(GCDAsyncSocket*)sock didReadData:(NSData *)data withTag:(long)tag
{
    VERBOSE_LOG(@"socket:didReadData socketId: %u", _socketId);

    assert([_readCallbacks count] != 0);
    void (^ callback)(NSData* data, NSString* address, uint16_t port) = [_readCallbacks objectAtIndex:0];
    assert(callback != nil);
    [_readCallbacks removeObjectAtIndex:0];

    callback(data, [sock connectedHost], [sock connectedPort]);
}

- (void)udpSocket:(GCDAsyncUdpSocket *)sock didReceiveData:(NSData *)data fromAddress:(NSData *)address withFilterContext:(id)filterContext
{
    VERBOSE_LOG(@"udbSocket:didReceiveData socketId: %u", _socketId);

    assert([_readCallbacks count] != 0);
    void (^ callback)(NSData* data, NSString* address, uint16_t port) = [_readCallbacks objectAtIndex:0];
    assert(callback != nil);
    [_readCallbacks removeObjectAtIndex:0];

    callback(data, [GCDAsyncUdpSocket hostFromAddress:address], [GCDAsyncUdpSocket portFromAddress:address]);
}

@end



#pragma mark ChromeSocket implementation

@implementation ChromeSocket

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];
    if (self) {
        _sockets = [NSMutableDictionary dictionary];
        _nextSocketId = 0;
    }
    return self;
}

- (void)destroyAllSockets
{
    NSLog(@"Destroying all open sockets");
    for (NSNumber *socketId in _sockets) {
        [self destroySocketWithId:socketId];
    }
    [_sockets removeAllObjects];
}

- (void)onReset
{
    [self destroyAllSockets];
}

- (void)dispose
{
    [self destroyAllSockets];
    [super dispose];
}

- (ChromeSocketSocket*) createNewSocketWithMode:(NSString*)mode
{
    return [self createNewSocketWithMode:mode socket:nil];
}

- (ChromeSocketSocket*) createNewSocketWithMode:(NSString*)mode socket:(id)theSocket
{
    ChromeSocketSocket* socket = [[ChromeSocketSocket alloc] initWithId:_nextSocketId++ mode:mode plugin:self socket:theSocket];
    [_sockets setObject:socket forKey:[NSNumber numberWithUnsignedInteger:socket->_socketId]];
    return socket;
}



- (void)create:(CDVInvokedUrlCommand*)command
{
    NSString* socketMode = [command argumentAtIndex:0];

    ChromeSocketSocket* socket = [self createNewSocketWithMode:socketMode];

    VERBOSE_LOG(@"NTFY %d.%@ Create", socket->_socketId, command.callbackId);
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:socket->_socketId] callbackId:command.callbackId];
}

- (void)destroy:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    [self destroySocketWithId:socketId];
    [_sockets removeObjectForKey:socketId];
}

- (void)destroySocketWithId:(NSNumber *)socketId
{
    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];

    if (socket == nil)
        return;

    if ([socket->_mode isEqualToString:@"udp"]) {
        [socket->_socket closeAfterSending];
    } else {
        [socket->_socket disconnect];
    }

    VERBOSE_LOG(@"NTFY %@.%@ Destroy", socketId, command.callbackId);
}



- (void)connect:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSString* address = [command argumentAtIndex:1];
    NSUInteger port = [[command argumentAtIndex:2] unsignedIntegerValue];

    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];

    if (socket == nil) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR] callbackId:command.callbackId];
        return;
    }

    socket->_connectCallback = [^(BOOL success) {
        VERBOSE_LOG(@"ACK %@.%@ Connect: %d", socketId, command.callbackId, success);

        if (success) {
            [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
        } else {
            [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR] callbackId:command.callbackId];
        }
    } copy];

    VERBOSE_LOG(@"REQ %@.%@ Connect", socketId, command.callbackId);
    // same selector for both tcp and udp
    BOOL success = [socket->_socket connectToHost:address onPort:port error:nil];
    if (!success) {
        void(^callback)(BOOL) = socket->_connectCallback;
        callback(NO);
        socket->_connectCallback = nil;
    }
}

- (void)bind:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSString* address = [command argumentAtIndex:1];
    NSUInteger port = [[command argumentAtIndex:2] unsignedIntegerValue];

    if ([address isEqualToString:@"0.0.0.0"])
        address = nil;

    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];

    BOOL success = (socket != nil) && [socket->_mode isEqualToString:@"udp"] && [socket->_socket bindToPort:port interface:address error:nil];

    VERBOSE_LOG(@"NTFY %@.%@ Bind: %d", socketId, command.callbackId, success);

    if (success) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
    } else {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR] callbackId:command.callbackId];
    }
}

- (void)disconnect:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];

    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];

    if (socket == nil)
        return;

    VERBOSE_LOG(@"NTFY %@.%@ Disconnect", socketId, command.callbackId);

    if ([socket->_mode isEqualToString:@"tcp"]) {
        [socket->_socket disconnectAfterReadingAndWriting];
    }
}



- (void)read:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSUInteger bufferSize = [[command argumentAtIndex:1] unsignedIntegerValue];

    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];

    if (socket == nil) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR] callbackId:command.callbackId];
        return;
    }

    [socket->_readCallbacks addObject:[^(NSData* data, NSString* address, uint16_t port) {
        VERBOSE_LOG(@"ACK %@.%@ Read Payload(%d): %@", socketId, command.callbackId, [data length], stringFromData(data));

        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArrayBuffer:data] callbackId:command.callbackId];
    } copy]];

    VERBOSE_LOG(@"REQ %@.%@ Read", socketId, command.callbackId);

    BOOL success = YES;
    if ([socket->_mode isEqualToString:@"udp"]) {
        success = [socket->_socket receiveOnce:nil];
    } else {
        [socket->_socket readDataWithTimeout:-1 buffer:nil bufferOffset:0 maxLength:bufferSize tag:-1];
    }

    if (!success) {
        [socket->_readCallbacks removeLastObject];
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR] callbackId:command.callbackId];
    }
}

- (void)write:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSData* data = [command argumentAtIndex:1];

    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];

    if (socket == nil) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR] callbackId:command.callbackId];
        return;
    }

    [socket->_writeCallbacks addObject:[^(BOOL success) {
        VERBOSE_LOG(@"ACK %@.%@ Write: %d", socketId, command.callbackId, success);

        if (success) {
            [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:[data length]] callbackId:command.callbackId];
        } else {
            [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR] callbackId:command.callbackId];
        }
    } copy]];

    VERBOSE_LOG(@"REQ %@.%@ Write Payload(%d): %@", socketId, command.callbackId, [data length], stringFromData(data));
    if ([socket->_mode isEqualToString:@"tcp"]) {
        [socket->_socket writeData:data withTimeout:-1 tag:-1];
    } else {
        [socket->_socket sendData:data withTimeout:-1 tag:-1];
    }
}



- (void)recvFrom:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSUInteger bufferSize = [[command argumentAtIndex:1] unsignedIntegerValue];

    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];

    if (socket == nil || ![socket->_mode isEqualToString:@"udp"]) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR] callbackId:command.callbackId];
        return;
    }

    [socket->_readCallbacks addObject:[^(NSData* data, NSString* address, uint16_t port) {
        VERBOSE_LOG(@"ACK %@.%@ recvFrom Payload(%d): %@, address: %@, port: %u", socketId, command.callbackId, [data length], stringFromData(data), address, port);
        if (bufferSize > 0 && [data length] > bufferSize) {
            data = [NSData dataWithBytes:data.bytes length:bufferSize];
        }

        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsMultipart:@[data, address, [NSNumber numberWithUnsignedInt:port]]] callbackId:command.callbackId];
    } copy]];

    BOOL success = [socket->_socket receiveOnce:nil];

    VERBOSE_LOG(@"REQ %@.%@ recvFrom: %d", socketId, command.callbackId, success);

    if (!success) {
        [socket->_readCallbacks removeLastObject];
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR] callbackId:command.callbackId];
    }
}

- (void)sendTo:(CDVInvokedUrlCommand*)command
{
    NSDictionary* arguments = [command argumentAtIndex:0];
    NSNumber* socketId = [arguments objectForKey:@"socketId"];
    NSString* address = [arguments objectForKey:@"address"];
    NSNumber* port = [arguments objectForKey:@"port"];
    NSData* data = [command argumentAtIndex:1];

    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];

    if (socket == nil || ![socket->_mode isEqualToString:@"udp"]) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR] callbackId:command.callbackId];
        return;
    }

    [socket->_writeCallbacks addObject:[^(BOOL success) {
        VERBOSE_LOG(@"ACK %@.%@ Write: %d", socketId, command.callbackId, success);

        if (success) {
            [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:[data length]] callbackId:command.callbackId];
        } else {
            [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR] callbackId:command.callbackId];
        }
    } copy]];

    VERBOSE_LOG(@"REQ %@.%@ Write Payload(%d): %@", socketId, command.callbackId, [data length], stringFromData(data));
    [socket->_socket sendData:data toHost:address port:[port unsignedIntegerValue] withTimeout:-1 tag:-1];
}



- (void)listen:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSString* address = [command argumentAtIndex:1];
    NSUInteger port = [[command argumentAtIndex:2] unsignedIntegerValue];
//    NSUInteger backlog = [[command argumentAtIndex:3] unsignedIntegerValue];

    if ([address isEqualToString:@"0.0.0.0"])
        address = nil;

    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];

    if (socket == nil || ![socket->_mode isEqualToString:@"tcp"]) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR] callbackId:command.callbackId];
        return;
    }

    NSError* error = nil;
    BOOL success = [socket->_socket acceptOnInterface:address port:port error:&error];
    VERBOSE_LOG(@"NTFY %@.%@ Listen on addr: %@ and port: %d -- %@", socketId, command.callbackId, address, port, error);

    if (success) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
    } else {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR] callbackId:command.callbackId];
    }
}

- (void)accept:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];

    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];

    if (socket == nil || ![socket->_mode isEqualToString:@"tcp"]) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR] callbackId:command.callbackId];
        return;
    }

    void (^callback)(NSUInteger socketId) = [^(NSUInteger socketId) {
        VERBOSE_LOG(@"ACK %d.%@ Accepted socketId: %u", socket->_socketId, command.callbackId, socketId);

        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:socketId] callbackId:command.callbackId];
    } copy];

    VERBOSE_LOG(@"REQ %@.%@ Accept", socketId, command.callbackId);

    if ([socket->_acceptSocketQueue count] == 0) {
        socket->_acceptCallback = callback;
    } else {
        ChromeSocketSocket* acceptSocket = [socket->_acceptSocketQueue dequeue];

        callback(acceptSocket->_socketId);
    }
}


- (void)getInfo:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];

    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];

    if (socket == nil) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR] callbackId:command.callbackId];
        return;
    }

    NSString* socketType = socket->_mode;
    NSNumber* connected = [NSNumber numberWithBool:[socket->_socket isConnected]];
    NSString* localAddress = [socket->_socket localHost];
    NSNumber* localPort = [NSNumber numberWithUnsignedInt:[socket->_socket localPort]];
    NSString* peerAddress = [socket->_socket connectedHost];
    NSNumber* peerPort = [NSNumber numberWithUnsignedInt:[socket->_socket connectedPort]];

    NSMutableDictionary* socketInfo = [@{
        @"socketType": socketType,
        @"connected": connected,
    } mutableCopy];

    if (localAddress) {
        [socketInfo setObject:localAddress forKey:@"localAddress"];
        [socketInfo setObject:localPort forKey:@"localPort"];
    }
    if (peerAddress) {
        [socketInfo setObject:peerAddress forKey:@"peerAddress"];
        [socketInfo setObject:peerPort forKey:@"peerPort"];
    }

    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:socketInfo] callbackId:command.callbackId];
}

- (void)joinGroup:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSString* address = [command argumentAtIndex:1];

    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];

    if (socket == nil || ![socket->_mode isEqualToString:@"udp"]) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR] callbackId:command.callbackId];
        return;
    }

    VERBOSE_LOG(@"REQ %@.%@ joinGroup", socketId, command.callbackId);

    BOOL success = ![socket->_multiCastGroups containsObject:address] && [socket->_socket joinMulticastGroup:address error:nil];

    if (success) {
        [socket->_multiCastGroups addObject:address];
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
    } else {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR] callbackId:command.callbackId];
    }
}

- (void)leaveGroup:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSString* address = [command argumentAtIndex:1];

    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];

    if (socket == nil || ![socket->_mode isEqualToString:@"udp"]) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR] callbackId:command.callbackId];
        return;
    }

    VERBOSE_LOG(@"REQ %@.%@ leaveGroup", socketId, command.callbackId);

    BOOL success = [socket->_multiCastGroups containsObject:address] && [socket->_socket leaveMulticastGroup:address error:nil];
    if (success) {
        [socket->_multiCastGroups removeObject:address];
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
    } else {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR] callbackId:command.callbackId];
    }
}

- (void)getJoinedGroups:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];

    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];

    if (socket == nil || ![socket->_mode isEqualToString:@"udp"]) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR] callbackId:command.callbackId];
        return;
    }

    VERBOSE_LOG(@"REQ %@.%@ getJoinedGroups", socketId, command.callbackId);

    NSArray* ret = [socket->_multiCastGroups allObjects];
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:ret] callbackId:command.callbackId];
}

@end
