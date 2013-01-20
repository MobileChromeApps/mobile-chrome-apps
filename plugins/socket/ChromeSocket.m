//
//  Socket.m
//  Generic
//
//  Created by Michal Mocny on 11/29/12.
//
//

#import "ChromeSocket.h"
#import "GCDAsyncSocket.h"
#import "GCDAsyncUdpSocket.h"

@interface ChromeSocketSocket : NSObject {}

@property (nonatomic, weak) ChromeSocket* plugin;

@property (nonatomic) NSUInteger socketId;
@property (nonatomic, strong) NSString* mode;
@property (nonatomic, strong) GCDAsyncSocket* socket;

@property (nonatomic, strong) NSString* addr;
@property (nonatomic) NSUInteger port;

@property (nonatomic, strong) id connectCallback;
@property (nonatomic, strong) id acceptCallback;
@property (nonatomic, strong) NSMutableArray* readCallbacks;
@property (nonatomic, strong) NSMutableArray* writeCallbacks;

@end

@interface  ChromeSocket()

@property (nonatomic, strong) NSMutableDictionary* sockets;
@property (nonatomic) NSUInteger nextSocketId;

- (ChromeSocketSocket*) createNewSocketWithMode:(NSString*)mode;

@end


@implementation ChromeSocketSocket

@synthesize plugin;
@synthesize socketId;
@synthesize mode;
@synthesize addr;
@synthesize port;
@synthesize connectCallback;
@synthesize acceptCallback;
@synthesize readCallbacks;
@synthesize writeCallbacks;

- (ChromeSocketSocket*)initWithId:(NSUInteger)theSocketId mode:(NSString*)theMode plugin:(ChromeSocket*)thePlugin
{
    self = [super init];
    if (self) {
        self.socketId = theSocketId;
        self.mode = theMode;
        self.plugin = thePlugin;
        
        self.readCallbacks = [NSMutableArray array];
        self.writeCallbacks = [NSMutableArray array];
        
        GCDAsyncSocket* socket = [[GCDAsyncSocket alloc] initWithDelegate:self delegateQueue:dispatch_get_main_queue()];
        self.socket = socket;
    }
    return self;
}

- (void)dealloc
{
    if (self.socket != nil) {
        // TODO: make sure we disconnect/destroy on cleanup.  This may already be guarenteed.
    }
}


- (void)socket:(GCDAsyncSocket *)sock didConnectToHost:(NSString *)host port:(UInt16)thePort
{
    //    NSLog(@"didConnectToHost: %@ port: %u", host, thePort);
    
    void (^ callback)() = self.connectCallback;
    assert(callback != nil);
    
    callback();
    
    self.connectCallback = nil;
}

- (void)socket:(GCDAsyncSocket *)sock didAcceptNewSocket:(GCDAsyncSocket *)newSocket
{
    // TODO: retain newSocket or else
    ChromeSocketSocket* socket = [self.plugin createNewSocketWithMode:self.mode];
    void (^ callback)(NSUInteger socketId) = self.acceptCallback;
    assert(callback != nil);

    callback(socket.socketId);
    
    self.acceptCallback = nil;
}

- (void)socketDidDisconnect:(GCDAsyncSocket *)sock withError:(NSError *)error
{
    //    NSLog(@"socketDidDisconnect:");
}

- (void)socket:(GCDAsyncSocket *)sock didReadData:(NSData *)data withTag:(long)tag
{
    //    NSLog(@"didReadData: %@ tag: %lu", [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding], tag);
    
    void (^ callback)(NSData*) = [self.readCallbacks objectAtIndex:0];
    assert(callback != nil);

    callback(data);
    
    [self.readCallbacks removeObjectAtIndex:0];
}

- (void)socket:(GCDAsyncSocket *)sock didWriteDataWithTag:(long)tag
{
    //    NSLog(@"didWriteDataWithTag: %lu", tag);
    
    void (^ callback)() = [self.writeCallbacks objectAtIndex:0];
    assert(callback != nil);

    callback();
    
    [self.writeCallbacks removeObjectAtIndex:0];
}

@end



@implementation ChromeSocket

@synthesize sockets;
@synthesize nextSocketId;

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];
    if (self) {
        self.sockets = [NSMutableDictionary dictionary];
        self.nextSocketId = 0;
    }
    return self;
}

- (ChromeSocketSocket*) createNewSocketWithMode:(NSString*)mode
{
    ChromeSocketSocket* socket = [[ChromeSocketSocket alloc] initWithId:self.nextSocketId++ mode:mode plugin:self];
    [self.sockets setObject:socket forKey:[NSNumber numberWithUnsignedInteger:socket.socketId]];
    return socket;
}

- (void)create:(CDVInvokedUrlCommand*)command
{
    NSDictionary* options = [command.arguments objectAtIndex:0];
    
    NSString* socketMode = [options objectForKey:@"socketMode"];
    assert([socketMode isEqualToString:@"tcp"]);
    
    ChromeSocketSocket* socket = [self createNewSocketWithMode:socketMode];

    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:socket.socketId] callbackId:command.callbackId];
}

- (void)connect:(CDVInvokedUrlCommand*)command
{
    NSDictionary* options = [command.arguments objectAtIndex:0];
    NSNumber* socketId = [options objectForKey:@"socketId"];
    NSString* address = [options objectForKey:@"address"];
    NSUInteger port = [[options objectForKey:@"port"] unsignedIntegerValue];
    
    ChromeSocketSocket* socket = [self.sockets objectForKey:socketId];
    assert(socket != nil);
    
    [socket.socket connectToHost:address onPort:port error:nil];
    socket.addr = address;
    socket.port = port;
    
    socket.connectCallback = [^() {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:0] callbackId:command.callbackId];
    } copy];
}

- (void)listen:(CDVInvokedUrlCommand*)command
{
    NSDictionary* options = [command.arguments objectAtIndex:0];
    NSNumber* socketId = [options objectForKey:@"socketId"];
//    NSString* address = [options objectForKey:@"address"];
    NSUInteger port = [[options objectForKey:@"port"] unsignedIntegerValue];
//    NSUInteger backlog = [[options objectForKey:@"backlog"] unsignedIntegerValue];

    ChromeSocketSocket* socket = [self.sockets objectForKey:socketId];
    assert(socket != nil);

    [socket.socket acceptOnPort:port error:nil];
    // TODO: Queue up connections until next accept called
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:0] callbackId:command.callbackId];
}

- (void)accept:(CDVInvokedUrlCommand*)command
{
    // TODO: support a queue of accepted sockets, in case a client connects before server accepts.
    
    NSDictionary* options = [command.arguments objectAtIndex:0];
    NSNumber* socketId = [options objectForKey:@"socketId"];
    
    ChromeSocketSocket* socket = [self.sockets objectForKey:socketId];
    assert(socket != nil);
    
    socket.acceptCallback = [^(NSUInteger socketId) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:socketId] callbackId:command.callbackId];
    } copy];
}

- (void)write:(CDVInvokedUrlCommand*)command
{
    assert([command.arguments count] == 2);
    NSDictionary* options = [command.arguments objectAtIndex:0];
    NSNumber* socketId = [options objectForKey:@"socketId"];
    NSData* data = [command.arguments objectAtIndex:1];
    
    ChromeSocketSocket* socket = [self.sockets objectForKey:socketId];
    assert(socket != nil);
    
    [socket.socket writeData:data withTimeout:-1 tag:-1];
    
    [socket.writeCallbacks addObject:[^(){
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:[data length]] callbackId:command.callbackId];
    } copy]];
}

- (void)read:(CDVInvokedUrlCommand*)command
{
    NSDictionary* options = [command.arguments objectAtIndex:0];
    NSNumber* socketId = [options objectForKey:@"socketId"];
    NSUInteger bufferSize = [[options objectForKey:@"bufferSize"] unsignedIntegerValue];

    ChromeSocketSocket* socket = [self.sockets objectForKey:socketId];
    assert(socket != nil);
    
    if (bufferSize != 0) {
        [socket.socket readDataToLength:bufferSize withTimeout:-1 tag:-1];
    } else {
        [socket.socket readDataWithTimeout:-1 tag:-1];
    }
    
    [socket.readCallbacks addObject:[^(NSData* data){
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArrayBuffer:data] callbackId:command.callbackId];
    } copy]];
}

- (void)disconnect:(CDVInvokedUrlCommand*)command
{
    NSDictionary* options = [command.arguments objectAtIndex:0];
    NSNumber* socketId = [options objectForKey:@"socketId"];
    
    ChromeSocketSocket* socket = [self.sockets objectForKey:socketId];
    assert(socket != nil);
    
    [socket.socket disconnectAfterReadingAndWriting];
    socket.addr = nil;
    socket.port = 0;
}

- (void)destroy:(CDVInvokedUrlCommand*)command
{
    NSDictionary* options = [command.arguments objectAtIndex:0];
    NSNumber* socketId = [options objectForKey:@"socketId"];
    
    ChromeSocketSocket* socket = [self.sockets objectForKey:socketId];
    assert(socket != nil);
    
    [self.sockets removeObjectForKey:[NSNumber numberWithUnsignedInteger:socket.socketId]];
}

@end
