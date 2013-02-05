// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import "ChromeSocket.h"
#import "GCDAsyncSocket.h"
#import "GCDAsyncUdpSocket.h"

#ifndef CHROME_SOCKET_VERBOSE_LOGGING
#define CHROME_SOCKET_VERBOSE_LOGGING 1
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


        if (theSocket == nil) {
            if ([_mode isEqualToString:@"tcp"]) {
                theSocket = [[GCDAsyncSocket alloc] initWithDelegate:self delegateQueue:dispatch_get_main_queue()];
            } else {
                theSocket = [[GCDAsyncUdpSocket alloc] initWithDelegate:self delegateQueue:dispatch_get_main_queue()];
            }
        } else {
            [theSocket setDelegate:self];
        }
        // TODO: is this going to retain?
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
    void (^ callback)() = _connectCallback;
    assert(callback != nil);

    callback();

    _connectCallback = nil;
}

- (void)udpSocket:(GCDAsyncUdpSocket *)sock didConnectToAddress:(NSData *)address
{
    void (^ callback)() = _connectCallback;
    assert(callback != nil);

    callback();

    _connectCallback = nil;
}

- (void)udpSocket:(GCDAsyncUdpSocket *)sock didNotConnect:(NSError *)error
{
    void (^ callback)() = _connectCallback;
    assert(callback != nil);
    _connectCallback = nil;

    NSLog(@"Failed to connect");
}

- (void)socket:(GCDAsyncSocket*)sock didAcceptNewSocket:(id)newSocket
{
    ChromeSocketSocket* socket = [_plugin createNewSocketWithMode:_mode socket:newSocket];

    void (^ callback)(NSUInteger socketId) = _acceptCallback;
    assert(callback != nil);

    callback(socket->_socketId);

    _acceptCallback = nil;
}

- (void)socketDidDisconnect:(GCDAsyncSocket*)sock withError:(NSError *)error
{
}

- (void)udpSocketDidClose:(GCDAsyncUdpSocket *)sock withError:(NSError *)error
{

}

- (void)socket:(GCDAsyncSocket*)sock didWriteDataWithTag:(long)tag
{
    VERBOSE_LOG(@"socket:didWriteDataWithTag socketId: %u", _socketId);
    assert([_writeCallbacks count] != 0);
    void (^ callback)() = [_writeCallbacks objectAtIndex:0];
    assert(callback != nil);

    callback();

    [_writeCallbacks removeObjectAtIndex:0];
}

- (void)udpSocket:(GCDAsyncUdpSocket *)sock didSendDataWithTag:(long)tag
{
    VERBOSE_LOG(@"udpSocket:didSendDataWithTag socketId: %u", _socketId);
    assert([_writeCallbacks count] != 0);
    void (^ callback)() = [_writeCallbacks objectAtIndex:0];
    assert(callback != nil);

    callback();

    [_writeCallbacks removeObjectAtIndex:0];
}

- (void)udpSocket:(GCDAsyncUdpSocket *)sock didNotSendDataWithTag:(long)tag dueToError:(NSError *)error
{
    VERBOSE_LOG(@"udpSocket:didNotSendDataWithTag socketId: %u", _socketId);
    assert([_writeCallbacks count] != 0);
    void (^ callback)() = [_writeCallbacks objectAtIndex:0];
    assert(callback != nil);
    [_writeCallbacks removeObjectAtIndex:0];

    NSLog(@"Failed to send");
}

- (void)socket:(GCDAsyncSocket*)sock didReadData:(NSData *)data withTag:(long)tag
{
    VERBOSE_LOG(@"socket:didReadData socketId: %u", _socketId);
    assert([_readCallbacks count] != 0);
    void (^ callback)(NSData* data, NSString* address, uint16_t port) = [_readCallbacks objectAtIndex:0];
    assert(callback != nil);

    callback(data, [sock connectedHost], [sock connectedPort]);

    [_readCallbacks removeObjectAtIndex:0];
}

- (void)udpSocket:(GCDAsyncUdpSocket *)sock didReceiveData:(NSData *)data fromAddress:(NSData *)address withFilterContext:(id)filterContext
{
    VERBOSE_LOG(@"udbSocket:didReceiveData socketId: %u", _socketId);
    assert([_readCallbacks count] != 0);
    void (^ callback)(NSData* data, NSString* address, uint16_t port) = [_readCallbacks objectAtIndex:0];
    assert(callback != nil);

    callback(data, [GCDAsyncUdpSocket hostFromAddress:address], [GCDAsyncUdpSocket portFromAddress:address]);

    [_readCallbacks removeObjectAtIndex:0];
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

    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];
    assert(socket != nil);

    if ([socket->_mode isEqualToString:@"udp"]) {
        [socket->_socket closeAfterSending];
    }

    [_sockets removeObjectForKey:[NSNumber numberWithUnsignedInteger:socket->_socketId]];
    VERBOSE_LOG(@"NTFY %@.%@ Destroy", socketId, command.callbackId);
}



- (void)connect:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSString* address = [command argumentAtIndex:1];
    NSUInteger port = [[command argumentAtIndex:2] unsignedIntegerValue];

    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];
    assert(socket != nil);

    socket->_connectCallback = [^() {
        VERBOSE_LOG(@"ACK %@.%@ Connect", socketId, command.callbackId);
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:0] callbackId:command.callbackId];
    } copy];

    VERBOSE_LOG(@"REQ %@.%@ Connect", socketId, command.callbackId);
    [socket->_socket connectToHost:address onPort:port error:nil]; // same selector for both tcp and udp
}

- (void)bind:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSString* address = [command argumentAtIndex:1];
    NSUInteger port = [[command argumentAtIndex:2] unsignedIntegerValue];

    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];
    assert(socket != nil);
    assert([socket->_mode isEqualToString:@"udp"]);

    VERBOSE_LOG(@"NTFY %@.%@ Bind", socketId, command.callbackId);
    NSError *__autoreleasing error = nil;
    [socket->_socket bindToPort:port interface:address error:&error];
    assert(error == nil);

    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:0] callbackId:command.callbackId];
}

- (void)disconnect:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];

    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];
    assert(socket != nil);

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
    assert(socket != nil);
    assert(socket->_socketId == [socketId unsignedIntegerValue]);

    [socket->_readCallbacks addObject:[^(NSData* data, NSString* address, uint16_t port) {
        VERBOSE_LOG(@"ACK %@.%@ Read Payload(%d): %@", socketId, command.callbackId, [data length], stringFromData(data));

        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArrayBuffer:data] callbackId:command.callbackId];
    } copy]];

    VERBOSE_LOG(@"REQ %@.%@ Read", socketId, command.callbackId);

    if ([socket->_mode isEqualToString:@"udp"]) {
        [socket->_socket receiveOnce:nil];
    } else if (bufferSize == 0) {
        [socket->_socket readDataWithTimeout:-1 tag:-1];
    } else {
        [socket->_socket readDataToLength:bufferSize withTimeout:-1 tag:-1];
    }
}

- (void)write:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSData* data = [command argumentAtIndex:1];

    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];
    assert(socket != nil);
    assert(socket->_socketId == [socketId unsignedIntegerValue]);

    [socket->_writeCallbacks addObject:[^() {
        VERBOSE_LOG(@"ACK %@.%@ Write", socketId, command.callbackId);

        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:[data length]] callbackId:command.callbackId];
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
    // TODO: use bufferSize
//    NSUInteger bufferSize = [[command argumentAtIndex:1] unsignedIntegerValue];

    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];
    assert(socket != nil);
    assert([socket->_mode isEqualToString:@"udp"]);

    [socket->_readCallbacks addObject:[^(NSData* data, NSString* address, uint16_t port) {
        VERBOSE_LOG(@"ACK %@.%@ recvFrom Payload(%d): %@", socketId, command.callbackId, [data length], stringFromData(data));

        // TODO: also return address and port.  Requires sending NSData along with other values back from plugin.
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArrayBuffer:data] callbackId:command.callbackId];
    } copy]];

    VERBOSE_LOG(@"REQ %@.%@ recvFrom", socketId, command.callbackId);
    [socket->_socket receiveOnce:nil];
}

- (void)sendTo:(CDVInvokedUrlCommand*)command
{
    NSDictionary* arguments = [command argumentAtIndex:0];
    NSNumber* socketId = [arguments objectForKey:@"socketId"];
    NSString* address = [arguments objectForKey:@"address"];
    NSNumber* port = [arguments objectForKey:@"port"];
    NSData* data = [command argumentAtIndex:1];

    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];
    assert(socket != nil);
    assert(socket->_socketId == [socketId unsignedIntegerValue]);
    assert([socket->_mode isEqualToString:@"udp"]);

    [socket->_writeCallbacks addObject:[^() {
        VERBOSE_LOG(@"ACK %@.%@ Write", socketId, command.callbackId);
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:[data length]] callbackId:command.callbackId];
    } copy]];

    VERBOSE_LOG(@"REQ %@.%@ Write Payload(%d): %@", socketId, command.callbackId, [data length], stringFromData(data));
    [socket->_socket sendData:data toHost:address port:[port unsignedIntegerValue] withTimeout:-1 tag:-1];
}



- (void)listen:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
//    NSString* address = [command argumentAtIndex:1];
    NSUInteger port = [[command argumentAtIndex:2] unsignedIntegerValue];
//    NSUInteger backlog = [[command argumentAtIndex:3] unsignedIntegerValue];

    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];
    assert(socket != nil);
    assert([socket->_mode isEqualToString:@"tcp"]);

    VERBOSE_LOG(@"NTFY %@.%@ Listen on port %d", socketId, command.callbackId, port);
    [socket->_socket acceptOnPort:port error:nil];

    // TODO: Queue up connections until next accept called
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:0] callbackId:command.callbackId];
}

- (void)accept:(CDVInvokedUrlCommand*)command
{
    // TODO: support a queue of accepted sockets, in case a client connects before server accepts.
    NSNumber* socketId = [command argumentAtIndex:0];

    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];
    assert(socket != nil);
    assert([socket->_mode isEqualToString:@"tcp"]);

    socket->_acceptCallback = [^(NSUInteger socketId) {
        VERBOSE_LOG(@"ACK %d.%@ Accept", socketId, command.callbackId);

        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:socketId] callbackId:command.callbackId];
    } copy];

    VERBOSE_LOG(@"REQ %@.%@ Accept", socketId, command.callbackId);
}

@end
