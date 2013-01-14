//
//  Socket.m
//  Generic
//
//  Created by Michal Mocny on 11/29/12.
//
//

#import "Socket.h"
#import "GCDAsyncSocket.h"
#import "GCDAsyncUdpSocket.h"

@interface  Socket()

@property (nonatomic, strong) NSMutableDictionary* sockets;
@property (nonatomic, strong) NSMutableDictionary* socketsAddress;
@property (nonatomic, strong) NSMutableDictionary* socketsPort;
@property (nonatomic) NSUInteger nextSocketId;
@property (nonatomic, strong) id connectCallback;
@property (nonatomic, strong) NSMutableArray* readCallbacks;
@property (nonatomic, strong) NSMutableArray* writeCallbacks;

@end

@implementation Socket

@synthesize sockets;
@synthesize socketsAddress;
@synthesize socketsPort;
@synthesize nextSocketId;
@synthesize connectCallback;
@synthesize readCallbacks;
@synthesize writeCallbacks;

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];
    if (self) {
        self.sockets = [NSMutableDictionary dictionary];
        self.socketsAddress = [NSMutableDictionary dictionary];
        self.socketsPort = [NSMutableDictionary dictionary];
        self.nextSocketId = 0;
        self.connectCallback = nil;
        self.readCallbacks = [NSMutableArray new];
        self.writeCallbacks = [NSMutableArray new];
    }
    return self;
}

- (void)create:(CDVInvokedUrlCommand*)command {
    NSDictionary* options = [command.arguments objectAtIndex:0];
    
    NSString* socketMode = [options objectForKey:@"socketMode"];
    assert([socketMode isEqualToString:@"tcp"]);
    
    GCDAsyncSocket* socket = [[GCDAsyncSocket alloc] initWithDelegate:self delegateQueue:dispatch_get_main_queue()];
    [socket setDelegate:self];
    
    NSString* key = [[NSNumber numberWithUnsignedInteger:++self.nextSocketId] stringValue];
    [self.sockets setValue:socket forKey:key];

    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:key] callbackId:command.callbackId];
}

- (void)connect:(CDVInvokedUrlCommand*)command {
    NSDictionary* options = [command.arguments objectAtIndex:0];
    NSString* socketId = [options objectForKey:@"socketId"];
    NSString* address = [options objectForKey:@"address"];
    NSUInteger port = [[options objectForKey:@"port"] unsignedIntegerValue];

    assert([self.sockets objectForKey:socketId] != nil);
    [self.socketsAddress setValue:address forKey:socketId];
    [self.socketsPort setValue:[NSNumber numberWithUnsignedInteger:port] forKey:socketId];
    
    GCDAsyncSocket* socket = [self.sockets objectForKey:socketId];
    [socket connectToHost:address onPort:port error:nil];
    
    self.connectCallback = [^() {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:0] callbackId:command.callbackId];
    } copy];
}

- (void)write:(CDVInvokedUrlCommand*)command {
    assert([command.arguments count] == 2);
    NSDictionary* options = [command.arguments objectAtIndex:0];
    NSString* socketId = [options objectForKey:@"socketId"];
    NSData* data = [command.arguments objectAtIndex:1];
    
    GCDAsyncSocket* socket = [self.sockets objectForKey:socketId];
    NSString* address = [self.socketsAddress objectForKey:socketId];
    NSUInteger port = [[self.socketsPort objectForKey:socketId] unsignedIntegerValue];
    assert(socket != nil);
    assert(address != nil);
    assert(port != 0);
    
    [socket writeData:data withTimeout:-1 tag:-1]; // udp: [socket sendData:data toHost:address port:port withTimeout:-1 tag:1];
    
    [self.writeCallbacks addObject:[^(){
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:[data length]] callbackId:command.callbackId];
    } copy]];
}

- (void)read:(CDVInvokedUrlCommand*)command {
    NSDictionary* options = [command.arguments objectAtIndex:0];
    NSString* socketId = [options objectForKey:@"socketId"];
    NSUInteger bufferSize = [[options objectForKey:@"bufferSize"] unsignedIntegerValue];

    GCDAsyncSocket* socket = [self.sockets objectForKey:socketId];
    if (bufferSize != 0) {
        [socket readDataToLength:bufferSize withTimeout:-1 tag:-1];
    } else {
        [socket readDataWithTimeout:-1 tag:-1];
    }
    
    [self.readCallbacks addObject:[^(NSData* data){
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArrayBuffer:data] callbackId:command.callbackId];
    } copy]];
}

- (void)disconnect:(CDVInvokedUrlCommand*)command {
    NSDictionary* options = [command.arguments objectAtIndex:0];
    NSString* socketId = [options objectForKey:@"socketId"];
    
    assert([self.sockets objectForKey:socketId] != nil);
    assert([self.socketsAddress objectForKey:socketId] != nil);
    assert([self.socketsPort objectForKey:socketId] != nil);
    
    GCDAsyncSocket* socket = [self.sockets objectForKey:socketId];
    [socket disconnectAfterReadingAndWriting];
    
    [self.socketsAddress removeObjectForKey:socketId];
    [self.socketsPort removeObjectForKey:socketId];
}

- (void)destroy:(CDVInvokedUrlCommand*)command {
    NSDictionary* options = [command.arguments objectAtIndex:0];
    NSString* socketId = [options objectForKey:@"socketId"];
    
    GCDAsyncUdpSocket* socket = [self.sockets objectForKey:socketId];
    assert(socket != nil);
    
    [self.sockets removeObjectForKey:socketId];
}




- (void)socket:(GCDAsyncSocket *)sock didConnectToHost:(NSString *)host port:(UInt16)port
{
//    NSLog(@"didConnectToHost: %@ port: %u", host, port);
    
    void (^ callback)() = self.connectCallback;
    callback();
    
    self.connectCallback = nil;
}

- (void)socketDidDisconnect:(GCDAsyncSocket *)sock withError:(NSError *)error
{
//    NSLog(@"socketDidDisconnect:");
}

- (void)socket:(GCDAsyncSocket *)sock didReadData:(NSData *)data withTag:(long)tag
{
//    NSLog(@"didReadData: %@ tag: %lu", [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding], tag);
    
    void (^ callback)(NSData*) = [self.readCallbacks objectAtIndex:0];
    callback(data);
    
    [self.readCallbacks removeObjectAtIndex:0];
}

- (void)socket:(GCDAsyncSocket *)sock didWriteDataWithTag:(long)tag
{
//    NSLog(@"didWriteDataWithTag: %lu", tag);
    
    void (^ callback)() = [self.writeCallbacks objectAtIndex:0];
    callback();
    
    [self.writeCallbacks removeObjectAtIndex:0];
}

@end
