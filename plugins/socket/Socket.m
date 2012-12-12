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
#import "NSData+Base64.h"
#import "NSString+Base64.h"

@interface  Socket()

@property (nonatomic, strong) NSMutableDictionary* sockets;
@property (nonatomic, strong) NSMutableDictionary* socketsAddress;
@property (nonatomic, strong) NSMutableDictionary* socketsPort;
@property (nonatomic) NSUInteger nextSocketId;
@property (nonatomic) id connectCallback;
@property (nonatomic) NSMutableArray* readCallbacks;
@property (nonatomic) NSMutableArray* writeCallbacks;

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
        sockets = [NSMutableDictionary dictionary];
        socketsAddress = [NSMutableDictionary dictionary];
        socketsPort = [NSMutableDictionary dictionary];
        nextSocketId = 0;
        connectCallback = nil;
        readCallbacks = [NSMutableArray new];
        writeCallbacks = [NSMutableArray new];
    }
    return self;
}

- (void)create:(CDVInvokedUrlCommand*)command {
    NSDictionary* options = [command.arguments objectAtIndex:0];
    
    NSString* socketMode = [options objectForKey:@"socketMode"];
    assert([socketMode isEqualToString:@"tcp"]);
    
    GCDAsyncSocket* socket = [[GCDAsyncSocket alloc] initWithDelegate:self delegateQueue:dispatch_get_main_queue()];
    [socket setDelegate:self];
    
    NSString* key = [[NSNumber numberWithUnsignedInteger:++nextSocketId] stringValue];
    [sockets setValue:socket forKey:key];

    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:key] callbackId:command.callbackId];
}

- (void)connect:(CDVInvokedUrlCommand*)command {
    NSDictionary* options = [command.arguments objectAtIndex:0];
    NSString* socketId = [options objectForKey:@"socketId"];
    NSString* address = [options objectForKey:@"address"];
    NSUInteger port = [[options objectForKey:@"port"] unsignedIntegerValue];

    assert([sockets objectForKey:socketId] != nil);
    [socketsAddress setValue:address forKey:socketId];
    [socketsPort setValue:[NSNumber numberWithUnsignedInteger:port] forKey:socketId];
    
    GCDAsyncSocket* socket = [sockets objectForKey:socketId];
    [socket connectToHost:address onPort:port error:nil];
    
    self.connectCallback = [^() {
        NSLog(@"Calling callback for connect");
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:0] callbackId:command.callbackId];
    } copy];
}

- (void)write:(CDVInvokedUrlCommand*)command {
    NSDictionary* options = [command.arguments objectAtIndex:0];
    NSString* socketId = [options objectForKey:@"socketId"];
    NSString *payload = [options objectForKey:@"data"];
    NSData* data = [NSData dataWithBase64EncodedString:payload]; // [payload dataUsingEncoding:NSUTF8StringEncoding];
    
    GCDAsyncSocket* socket = [sockets objectForKey:socketId];
    NSString* address = [socketsAddress objectForKey:socketId];
    NSUInteger port = [[socketsPort objectForKey:socketId] unsignedIntegerValue];
    assert(socket != nil);
    assert(address != nil);
    assert(port != 0);
    
    [socket writeData:data withTimeout:-1 tag:-1]; // udp: [socket sendData:data toHost:address port:port withTimeout:-1 tag:1];
    
    [writeCallbacks addObject:[^(){
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:[data length]] callbackId:command.callbackId];
    } copy]];
}

- (void)read:(CDVInvokedUrlCommand*)command {
    NSDictionary* options = [command.arguments objectAtIndex:0];
    NSString* socketId = [options objectForKey:@"socketId"];
    NSUInteger bufferSize = [[options objectForKey:@"bufferSize"] unsignedIntegerValue];

    GCDAsyncSocket* socket = [sockets objectForKey:socketId];
    [socket readDataToLength:bufferSize withTimeout:-1 tag:-1];
    
    [readCallbacks addObject:[^(NSData* data){
        NSString* dataAsBase64EncodedString = [data base64EncodedString];
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:dataAsBase64EncodedString] callbackId:command.callbackId];
    } copy]];
}

- (void)disconnect:(CDVInvokedUrlCommand*)command {
    NSDictionary* options = [command.arguments objectAtIndex:0];
    NSString* socketId = [options objectForKey:@"socketId"];
    
    assert([sockets objectForKey:socketId] != nil);
    assert([socketsAddress objectForKey:socketId] != nil);
    assert([socketsPort objectForKey:socketId] != nil);
    
    GCDAsyncSocket* socket = [sockets objectForKey:socketId];
    [socket disconnectAfterReadingAndWriting];
    
    [socketsAddress removeObjectForKey:socketId];
    [socketsPort removeObjectForKey:socketId];
}

- (void)destroy:(CDVInvokedUrlCommand*)command {
    NSDictionary* options = [command.arguments objectAtIndex:0];
    NSString* socketId = [options objectForKey:@"socketId"];
    
    GCDAsyncUdpSocket* socket = [sockets objectForKey:socketId];
    assert(socket != nil);
    [socket closeAfterSending];
    
    [sockets removeObjectForKey:socketId];
}




- (void)socket:(GCDAsyncSocket *)sock didConnectToHost:(NSString *)host port:(UInt16)port
{
    NSLog(@"didConnectToHost: %@ port: %u", host, port);
    
    void (^ callback)() = self.connectCallback;
    callback();
    
    self.connectCallback = nil;
}

- (void)socketDidDisconnect:(GCDAsyncSocket *)sock withError:(NSError *)error
{
    NSLog(@"socketDidDisconnect:");
}

- (void)socket:(GCDAsyncSocket *)sock didReadData:(NSData *)data withTag:(long)tag
{
    NSLog(@"didReadData: %@ tag: %lu", [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding], tag);
    
    void (^ callback)(NSData*) = [self.readCallbacks objectAtIndex:0];
    callback(data);
    
    [self.readCallbacks removeObjectAtIndex:0];
}

- (void)socket:(GCDAsyncSocket *)sock didWriteDataWithTag:(long)tag
{
    NSLog(@"didWriteDataWithTag: %lu", tag);
    
    void (^ callback)() = [self.writeCallbacks objectAtIndex:0];
    callback();
    
    [self.writeCallbacks removeObjectAtIndex:0];
}


@end
