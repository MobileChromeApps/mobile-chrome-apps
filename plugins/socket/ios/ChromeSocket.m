// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import "ChromeSocket.h"
#import "GCDAsyncSocket.h"
#import "GCDAsyncUdpSocket.h"

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

@interface ChromeSocketSocket : NSObject {
    @public
    __weak ChromeSocket* _plugin;

    NSUInteger _socketId;
    NSString* _mode;
    GCDAsyncSocket* _socket;

    NSString* _addr;
    NSUInteger _port;

    id _connectCallback;
    id _acceptCallback;
    NSMutableArray* _readCallbacks;
    NSMutableArray* _writeCallbacks;
}
@end

@interface ChromeSocket () {
    NSMutableDictionary* _sockets;
    NSUInteger _nextSocketId;
}
- (ChromeSocketSocket*) createNewSocketWithMode:(NSString*)mode socket:(GCDAsyncSocket*)theSocket;
@end


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
            theSocket = [[GCDAsyncSocket alloc] initWithDelegate:self delegateQueue:dispatch_get_main_queue()];
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


- (void)socket:(GCDAsyncSocket *)sock didConnectToHost:(NSString *)host port:(UInt16)thePort
{
    //    NSLog(@"didConnectToHost: %@ port: %u", host, thePort);
    
    void (^ callback)() = _connectCallback;
    assert(callback != nil);
    
    callback();
    
    _connectCallback = nil;
}

- (void)socket:(GCDAsyncSocket *)sock didAcceptNewSocket:(GCDAsyncSocket *)newSocket
{
    // TODO: retain newSocket or else
    ChromeSocketSocket* socket = [_plugin createNewSocketWithMode:_mode socket:newSocket];

    void (^ callback)(NSUInteger socketId) = _acceptCallback;
    assert(callback != nil);

    callback(socket->_socketId);
    
    _acceptCallback = nil;
}

- (void)socketDidDisconnect:(GCDAsyncSocket *)sock withError:(NSError *)error
{
    //    NSLog(@"socketDidDisconnect:");
}

- (void)socket:(GCDAsyncSocket *)sock didReadData:(NSData *)data withTag:(long)tag
{
    //    NSLog(@"didReadData: %@ tag: %lu", [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding], tag);
    
    VERBOSE_LOG(@"my socketId: %u", _socketId);
    assert([_readCallbacks count] != 0);
    void (^ callback)(NSData*) = [_readCallbacks objectAtIndex:0];
    assert(callback != nil);

    callback(data);
    
    [_readCallbacks removeObjectAtIndex:0];
}

- (void)socket:(GCDAsyncSocket *)sock didWriteDataWithTag:(long)tag
{
    //    NSLog(@"didWriteDataWithTag: %lu", tag);
    
    VERBOSE_LOG(@"my socketId: %u", _socketId);
    assert([_writeCallbacks count] != 0);
    void (^ callback)() = [_writeCallbacks objectAtIndex:0];
    assert(callback != nil);

    callback();
    
    [_writeCallbacks removeObjectAtIndex:0];
}

@end



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

- (ChromeSocketSocket*) createNewSocketWithMode:(NSString*)mode socket:(GCDAsyncSocket*)theSocket
{
    ChromeSocketSocket* socket = [[ChromeSocketSocket alloc] initWithId:_nextSocketId++ mode:mode plugin:self socket:theSocket];
    [_sockets setObject:socket forKey:[NSNumber numberWithUnsignedInteger:socket->_socketId]];
    return socket;
}

- (void)create:(CDVInvokedUrlCommand*)command
{
    NSString* socketMode = [command argumentAtIndex:0];
    assert([socketMode isEqualToString:@"tcp"]);
    
    ChromeSocketSocket* socket = [self createNewSocketWithMode:socketMode];

    VERBOSE_LOG(@"NTFY %d.%@ Create", socket->_socketId, command.callbackId);
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:socket->_socketId] callbackId:command.callbackId];
}

- (void)connect:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSString* address = [command argumentAtIndex:1];
    NSUInteger port = [[command argumentAtIndex:2] unsignedIntegerValue];
    
    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];
    assert(socket != nil);
    
    [socket->_socket connectToHost:address onPort:port error:nil];
    socket->_addr = address;
    socket->_port = port;
    
    VERBOSE_LOG(@"REQ %@.%@ Connect", socketId, command.callbackId);
    socket->_connectCallback = [^() {
        VERBOSE_LOG(@"ACK %@.%@ Connect", socketId, command.callbackId);
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:0] callbackId:command.callbackId];
    } copy];
}

- (void)listen:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
//    NSString* address = [command argumentAtIndex:1];
    NSUInteger port = [[command argumentAtIndex:2] unsignedIntegerValue];
//    NSUInteger backlog = [[command argumentAtIndex:3] unsignedIntegerValue];

    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];
    assert(socket != nil);

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
    
    VERBOSE_LOG(@"REQ %@.%@ Accept", socketId, command.callbackId);
    socket->_acceptCallback = [^(NSUInteger socketId) {
        VERBOSE_LOG(@"ACK %d.%@ Accept", socketId, command.callbackId);
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:socketId] callbackId:command.callbackId];
    } copy];
}

- (void)write:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSData* data = [command argumentAtIndex:1];
    
    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];
    assert(socket != nil);
    assert(socket->_socketId == [socketId unsignedIntegerValue]);
    
    [socket->_writeCallbacks addObject:[^(){
        VERBOSE_LOG(@"ACK %@.%@ Write", socketId, command.callbackId);
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:[data length]] callbackId:command.callbackId];
    } copy]];

    VERBOSE_LOG(@"REQ %@.%@ Write Payload(%d): %@", socketId, command.callbackId, [data length], stringFromData(data));
    [socket->_socket writeData:data withTimeout:-1 tag:-1];
}

- (void)read:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    NSUInteger bufferSize = [[command argumentAtIndex:1] unsignedIntegerValue];

    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];
    assert(socket != nil);
    assert(socket->_socketId == [socketId unsignedIntegerValue]);
    
    [socket->_readCallbacks addObject:[^(NSData* data){
        VERBOSE_LOG(@"ACK %@.%@ Read Payload(%d): %@", socketId, command.callbackId, [data length], stringFromData(data));
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArrayBuffer:data] callbackId:command.callbackId];
    } copy]];
    
    if (bufferSize != 0) {
        [socket->_socket readDataToLength:bufferSize withTimeout:-1 tag:-1];
    } else {
        [socket->_socket readDataWithTimeout:-1 tag:-1];
    }
    VERBOSE_LOG(@"REQ %@.%@ Read", socketId, command.callbackId);
}

- (void)disconnect:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    
    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];
    assert(socket != nil);
    
    [socket->_socket disconnectAfterReadingAndWriting];
    socket->_addr = nil;
    socket->_port = 0;
    VERBOSE_LOG(@"NTFY %@.%@ Disconnect", socketId, command.callbackId);
}

- (void)destroy:(CDVInvokedUrlCommand*)command
{
    NSNumber* socketId = [command argumentAtIndex:0];
    
    ChromeSocketSocket* socket = [_sockets objectForKey:socketId];
    assert(socket != nil);
    
    [_sockets removeObjectForKey:[NSNumber numberWithUnsignedInteger:socket->_socketId]];
    VERBOSE_LOG(@"NTFY %@.%@ Destroy", socketId, command.callbackId);
}

@end
