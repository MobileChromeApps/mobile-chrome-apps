// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source file is governed by a BSD-style license that can be
// found in the LICENSE file.

// TODO: Optimize chrome.bluetooth
// 1. only check removed bluetooth devices when user add listener to onDeviceRemoved
//    event.
// 2. Only Init ChromeBluetooth when user calls bluetooth API, or add listener to any
//    events.
#import <Cordova/CDV.h>
#import <Cordova/CDVPlugin.h>
#import <CoreBluetooth/CoreBluetooth.h>
#import "ChromeBluetooth.h"

#ifndef CHROME_BLUETOOTH_VERBOSE_LOGGING
#define CHROME_BLUETOOTH_VERBOSE_LOGGING 0
#endif

#if CHROME_BLUETOOTH_VERBOSE_LOGGING
#define VERBOSE_LOG NSLog
#else
#define VERBOSE_LOG(args...) do {} while (false)
#endif

#define REMOVED_DEVICE_CHECKING_INTERVAL 15 //second

@implementation CBUUID (UUIDString)

- (NSString*) UUIDStringFromData
{
    NSData *data = [self data];
    
    NSUInteger bytesToConvert = [data length];
    const unsigned char *uuidBytes = [data bytes];
    NSMutableString *outputString = [NSMutableString stringWithCapacity:16];
    
    for (NSUInteger currentByteIndex = 0; currentByteIndex < bytesToConvert; currentByteIndex++) {
        switch (currentByteIndex) {
            case 3:
            case 5:
            case 7:
            case 9:[outputString appendFormat:@"%02x-", uuidBytes[currentByteIndex]]; break;
            default:[outputString appendFormat:@"%02x", uuidBytes[currentByteIndex]];
        }
    }
    
    return outputString;   
}

// Generate the 128 bit UUIDString. If the UUID is 16 bit, it will be prefilled to 128 bit.
- (NSString *)fullUUIDString;
{
    NSString* outputString;
    if ([self respondsToSelector:@selector(UUIDString)]) {
        outputString = [self UUIDString];
    } else {
        outputString = [self UUIDStringFromData];
    }
    
    if ([outputString length] == 4) {
        // Convert 16 bits UUID to 128 bits UUID. Reference: http://en.wikipedia.org/wiki/Bluetooth_low_energy#Identifiers
        outputString = [NSString stringWithFormat:@"0000%@-0000-1000-8000-00805F9B34FB", outputString];
    }
    
    return [outputString lowercaseString];
}

@end
#pragma mark ChromeBluetooth interface

@interface ChromeBluetooth() <CBCentralManagerDelegate> {
    CBCentralManager* _centralManager;
    NSMutableDictionary* _peripherals;
    NSMutableSet* _activePeripherals;
    
    NSString* _bluetoothCallbackId;
    NSString* _bluetoothLowEnergyCallbackId;
   
    BOOL _isScanning;
    NSTimer* _removedDeviceTimer;
}
#pragma mark chrome.bluetooth interface

- (void)getAdapterState:(CDVInvokedUrlCommand*)command;
- (void)getDevice:(CDVInvokedUrlCommand*)command;
- (void)getDevices:(CDVInvokedUrlCommand*)command;
- (void)startDiscovery:(CDVInvokedUrlCommand*)command;
- (void)stopDiscovery:(CDVInvokedUrlCommand*)command;
- (void)registerBluetoothEvents:(CDVInvokedUrlCommand*)command;

- (void)sendDeviceChangedEvent:(NSDictionary*)deviceInfo;
- (void)sendServiceAddedEvent:(NSDictionary*)serviceInfo;
- (void)sendServiceChangedEvent:(NSDictionary*)serviceInfo;
- (void)sendServiceRemovedEvent:(NSDictionary*)serviceInfo;
- (void)sendCharacteristicValueChangedEvent:(NSArray*)characteristicInfo;
- (void)sendDescriptorValueChangedEvent:(NSArray*)descriptroInfo;
- (void)disconnectPeripheral:(CBPeripheral*)peripheral;

@end

#pragma mark ChromeBluetoothPeripheral interface

@interface ChromeBluetoothPeripheral : NSObject<CBPeripheralDelegate> {
    @public
    __weak ChromeBluetooth* _plugin;
    CBPeripheral* _peripheral;
    NSDictionary* _adData;
    NSNumber* _RSSI;
    
    // <InstanceId, CBService>
    NSMutableDictionary* _knownServices;
    // <InstanceId, CBCharacteristic>
    NSMutableDictionary* _knownCharacteristics;
    // <InstanceId, CBDescriptor>
    NSMutableDictionary* _knownDescriptors;
    
    id _connectCallback;
    id _disconnectCallback;
    
    NSMutableDictionary* _getIncludedServicesCallbacks;
    NSMutableDictionary* _getCharacteristicsCallbacks;
    NSMutableDictionary* _getDescriptorsCallbacks;
    NSMutableDictionary* _readCharacteristicValueCallbacks;
    NSMutableDictionary* _writeCharacteristicValueCallbacks;
    NSMutableDictionary* _startCharacteristicNotificationCallbacks;
    NSMutableDictionary* _stopCharacteristicNotificationCallbacks;
    NSMutableDictionary* _readDescriptorValueCallbacks;
    NSMutableDictionary* _writeDescriptorValueCallbacks;
}

@end

@implementation ChromeBluetoothPeripheral

- (ChromeBluetoothPeripheral*)initWithPeripheral:(CBPeripheral*)thePeripheral adData:(NSDictionary*)theAdData RSSI:(NSNumber*)RSSI plugin:(ChromeBluetooth*)thePlugin
{
    self = [super init];
    if (self) {
        _peripheral = thePeripheral;
        [_peripheral setDelegate:self];
        _plugin = thePlugin;
        _adData = theAdData;
        _RSSI = RSSI;
        
        _knownServices = [NSMutableDictionary dictionary];
        _knownCharacteristics = [NSMutableDictionary dictionary];
        _knownDescriptors = [NSMutableDictionary dictionary];
        
        _getIncludedServicesCallbacks = [NSMutableDictionary dictionary];
        _getCharacteristicsCallbacks = [NSMutableDictionary dictionary];
        _getDescriptorsCallbacks = [NSMutableDictionary dictionary];
        _readCharacteristicValueCallbacks = [NSMutableDictionary dictionary];
        _writeCharacteristicValueCallbacks = [NSMutableDictionary dictionary];
        _startCharacteristicNotificationCallbacks = [NSMutableDictionary dictionary];
        _stopCharacteristicNotificationCallbacks = [NSMutableDictionary dictionary];
        _readDescriptorValueCallbacks = [NSMutableDictionary dictionary];
        _writeDescriptorValueCallbacks = [NSMutableDictionary dictionary];
    }
    return self;
}

+ (NSString*)peripheralAddressFromUUID:(NSUUID*)identifier
{
    // TODO: find a way function to hash an UUIDString to a bluetooth address.
    // Device address should be a MAC address in format of "xx:xx:xx:xx:xx:xx",
    // and we can not get this information from iOS. We want to fake this by map
    // each UUID to a unique fake MAC address.
    return identifier.UUIDString;
}

- (NSString*)peripheralAddress
{
    return [ChromeBluetoothPeripheral peripheralAddressFromUUID:_peripheral.identifier];
}

- (NSString*)serviceIdFromService:(CBService*)service
{
    return [NSString stringWithFormat:@"%@/%@", [self peripheralAddress], [service.UUID fullUUIDString]];
}

- (NSString*)characteristicIdFromCharacteristic:(CBCharacteristic*)characteristic
{
    return [NSString stringWithFormat:@"%@/%@/%@", [self peripheralAddress], [characteristic.service.UUID fullUUIDString], [characteristic.UUID fullUUIDString]];
}

- (NSString*)descriptorIdFromDescriptor:(CBDescriptor*)descriptor
{
    return [NSString stringWithFormat:@"%@/%@/%@/%@", [self peripheralAddress], [descriptor.characteristic.service.UUID fullUUIDString], [descriptor.characteristic.UUID fullUUIDString], [descriptor.UUID fullUUIDString]];
}

- (BOOL)isConnected
{
    return _peripheral.state == CBPeripheralStateConnected;
}

- (NSDictionary*)getDeviceInfo
{
    NSMutableDictionary* deviceInfo = [@{
        @"address": [self peripheralAddress],
        @"connected": [NSNumber numberWithBool:[_peripheral state] == CBPeripheralStateConnected],
    } mutableCopy];
   
    NSString* name = [_peripheral name];
    if (name) {
        deviceInfo[@"name"] = name;
    }
    
    NSMutableSet* serviceUuids = [NSMutableSet set];
    
    NSArray* adServices = _adData[CBAdvertisementDataServiceUUIDsKey];
    if (adServices && [adServices count] > 0) {
        for (CBUUID* serviceUuid in adServices) {
            [serviceUuids addObject:[serviceUuid fullUUIDString]];
        }
    }
    
    NSArray* services = [_peripheral services];
    if (services && [services count] > 0) {
        for (CBService* service in services) {
            [serviceUuids addObject:[service.UUID fullUUIDString]];
        }
    }
    
    deviceInfo[@"uuids"] = [serviceUuids allObjects];
    deviceInfo[@"rssi"] = _RSSI;

    if (_adData[CBAdvertisementDataTxPowerLevelKey]) {
        deviceInfo[@"tx_power"] = _adData[CBAdvertisementDataTxPowerLevelKey];
    }
    
    NSDictionary* serviceDataInfo = _adData[CBAdvertisementDataServiceDataKey];
    if (serviceDataInfo) {
        for (CBUUID* serviceDataUuid in serviceDataInfo) {
            deviceInfo[@"serviceDataUuid"] = [serviceDataUuid fullUUIDString];
            deviceInfo[@"serviceData"] = [serviceDataInfo[serviceDataUuid] base64EncodedString];
        }
    }
    
    return deviceInfo;
}

- (NSDictionary*)buildServiceInfo:(CBService*)service
{
    NSString* serviceId = [self serviceIdFromService:service];
    
    if (!_knownServices[serviceId]) {
        _knownServices[serviceId] = service;
    }
    
    return @{
        @"uuid": [service.UUID fullUUIDString],
        @"deviceAddress": [self peripheralAddress],
        @"instanceId": serviceId,
        @"isPrimary": [NSNumber numberWithBool:service.isPrimary],
    };
}

- (NSDictionary*)getServiceInfoByServiceId:(NSString*)serviceId
{
    CBService* service = _knownServices[serviceId];
    if (service) {
        return [self buildServiceInfo:service];
    }
    return nil;
}

- (NSArray*)getServicesInfo
{
    NSMutableArray* servicesInfo = [NSMutableArray array];
    
    for (CBService* service in _peripheral.services) {
        [servicesInfo addObject:[self buildServiceInfo:service]];
    }
    return servicesInfo;
}

- (BOOL)discoveryIncludedServicesByServiceId:(NSString*)serviceId
{
    CBService* service = _knownServices[serviceId];
    if (service) {
        [_peripheral discoverIncludedServices:nil forService:service];
        return YES;
    }
    return NO;
}

- (NSDictionary*)buildCharacteristicInfo:(CBCharacteristic*)characteristic
{
    NSString* characteristicId = [self characteristicIdFromCharacteristic:characteristic];
    
    if (!_knownCharacteristics[characteristicId]) {
        _knownCharacteristics[characteristicId] = characteristic;
        if (characteristic.service) {
            [_plugin sendServiceChangedEvent:[self buildServiceInfo:characteristic.service]];
        }
    }
    
    NSMutableArray* properties = [NSMutableArray array];
    
    if (characteristic.properties & CBCharacteristicPropertyBroadcast) {
        [properties addObject:@"broadcast"];
    }
    
    if (characteristic.properties & CBCharacteristicPropertyRead) {
        [properties addObject:@"read"];
    }
    
    if (characteristic.properties & CBCharacteristicPropertyWriteWithoutResponse) {
        [properties addObject:@"writeWithoutResponse"];
    }
    
    if (characteristic.properties & CBCharacteristicPropertyWrite) {
        [properties addObject:@"write"];
    }
    
    if (characteristic.properties & CBCharacteristicPropertyNotify) {
        [properties addObject:@"notify"];
    }
    
    if (characteristic.properties & CBCharacteristicPropertyIndicate) {
        [properties addObject:@"indicate"];
    }
    
    if (characteristic.properties & CBCharacteristicPropertyAuthenticatedSignedWrites) {
        [properties addObject:@"authenticatedSignedWrites"];
    }
    
    if (characteristic.properties & CBCharacteristicPropertyExtendedProperties) {
        [properties addObject:@"extendedProperties"];
    }
    
    return @{
        @"uuid": [characteristic.UUID fullUUIDString],
        @"service": [self buildServiceInfo:characteristic.service],
        @"properties": properties,
        @"instanceId": characteristicId,
    };
}

- (NSData*)getCharacteristicValueByCharacteristicId:(NSString*)characteristicId
{
    CBCharacteristic* characteristic = _knownCharacteristics[characteristicId];
    
    if (characteristic) {
        return characteristic.value;
    }
    
    return nil;
}

- (NSDictionary*)getCharacteristicInfoByCharacteristicId:(NSString*)characteristicId
{
    CBCharacteristic* characteristic = _knownCharacteristics[characteristicId];
    
    if (characteristic) {
        return [self buildCharacteristicInfo:characteristic];
    }
    return nil;
}

- (BOOL)discoveryCharacteristicsByServiceId:(NSString*)serviceId
{
    CBService* service = _knownServices[serviceId];
    if (service) {
        [_peripheral discoverCharacteristics:nil forService:service];
        return YES;
    }
    return NO;
}

- (BOOL)readCharacteristicValueByCharacteristicId:(NSString*)characteristicId
{
    CBCharacteristic* characteristic = _knownCharacteristics[characteristicId];
    if (characteristic) {
        [_peripheral readValueForCharacteristic:characteristic];
        return YES;
    }
    return NO;
}

- (BOOL)writeCharacteristicValueByCharacteristicId:(NSString*)characteristicId value:(NSData*)value
{
    CBCharacteristic* characteristic = _knownCharacteristics[characteristicId];
    if (characteristic) {
        [_peripheral writeValue:value forCharacteristic:characteristic type:CBCharacteristicWriteWithResponse];
        return YES;
    }
    return NO;
}

- (BOOL)setCharacteristicNotificationValue:(BOOL)enabled CharacteristicId:(NSString*)characteristicId
{
    CBCharacteristic* characteristic = _knownCharacteristics[characteristicId];
    if (characteristic) {
        [_peripheral setNotifyValue:enabled forCharacteristic:characteristic];
        return YES;
    }
    return NO;
}

- (NSDictionary*)buildDescriptorInfo:(CBDescriptor*)descriptor
{
    NSString* descriptorId = [self descriptorIdFromDescriptor:descriptor];
    
    if (!_knownDescriptors[descriptorId]) {
        _knownDescriptors[descriptorId] = descriptor;
    }
    
    return @{
        @"uuid": [descriptor.UUID fullUUIDString],
        @"characteristic": [self buildCharacteristicInfo:descriptor.characteristic],
        @"instanceId": descriptorId,
    };
}

- (NSData*)getDescriptorValueByDescriptorId:(NSString*)descriptorId
{
    CBDescriptor* descriptor = _knownDescriptors[descriptorId];
    
    if (descriptor) {
        return descriptor.value;
    }
    
    return nil;
}

- (NSDictionary*)getDescriptorInfoByDescriptorId:(NSString*)descriptorId
{
    CBDescriptor* descriptor = _knownDescriptors[descriptorId];
    
    if (descriptor) {
        return [self buildDescriptorInfo:descriptor];
    }
    
    return nil;
}

- (BOOL)discoveryDescriptorByCharacteristicId:(NSString*)characteristicId
{
    CBCharacteristic* characteristic = _knownCharacteristics[characteristicId];
    if (characteristic) {
        [_peripheral discoverDescriptorsForCharacteristic:characteristic];
        return YES;
    }
    return NO;
}

- (BOOL)readDescriptorValueByDescriptorId:(NSString*)descriptorId
{
    CBDescriptor* descriptor = _knownDescriptors[descriptorId];
    if (descriptor) {
        [_peripheral readValueForDescriptor:descriptor];
        return YES;
    }
    return NO;
}

- (BOOL)writeDescriptorValueByDescriptorId:(NSString*)descriptorId value:(NSData*)value
{
    CBDescriptor* descriptor = _knownDescriptors[descriptorId];
    if (descriptor) {
        [_peripheral writeValue:value forDescriptor:descriptor];
        return YES;
    }
    return NO;
}

- (void)cleanup
{
    if (!_peripheral.isConnected) {
        return;
    }
    
    for (CBService* service in _peripheral.services) {
        for (CBCharacteristic* characteristic in service.characteristics) {
            if (characteristic.isNotifying) {
                [_peripheral setNotifyValue:NO forCharacteristic:characteristic];
            }
        }
        [_plugin sendServiceRemovedEvent:[self buildServiceInfo:service]];
    }
    
    [_plugin disconnectPeripheral:_peripheral];
    return;
}

- (void)callAndClear:(NSMutableDictionary*)blocks withInstanceId:(NSString*)instanceId array:(NSArray*)array error:(NSError*)error
{
    void (^callback)(NSArray*, NSError*) = blocks[instanceId];
    if (callback != nil) {
        [blocks removeObjectForKey:instanceId];
        callback(array, error);
    }
}

- (void)callAndClear:(NSMutableDictionary*)blocks withInstanceId:(NSString *)instanceId error:(NSError *)error
{
    void (^callback)(NSError*) = blocks[instanceId];
    if (callback != nil) {
        [blocks removeObjectForKey:instanceId];
        callback(error);
    }
}

# pragma mark CBPeripheralDelegate methods

// Note: this delegate does not work correctly for cached device.
// See: http://stackoverflow.com/questions/13180134/corebluetooth-refreshing-local-name-of-an-already-discovered-peripheral
- (void)peripheralDidUpdateName:(CBPeripheral *)peripheral
{
    [_plugin sendDeviceChangedEvent:[self getDeviceInfo]];
}

- (void)peripheral:(CBPeripheral *)peripheral didModifyServices:(NSArray *)invalidatedServices
{
    for (CBService* service in invalidatedServices) {
        [_plugin sendServiceRemovedEvent:[self buildServiceInfo:service]];
        [_knownServices removeObjectForKey:[self serviceIdFromService:service]];
    }
}

- (void)peripheral:(CBPeripheral *)peripheral didDiscoverServices:(NSError *)error
{
    for (CBService* service in peripheral.services) {
        [_plugin sendServiceAddedEvent:[self buildServiceInfo:service]];
    }
    
    [_plugin sendDeviceChangedEvent:[self getDeviceInfo]];
}

- (void)peripheral:(CBPeripheral *)peripheral didDiscoverIncludedServicesForService:(CBService *)service error:(NSError *)error
{
    NSMutableArray* includedServicesInfo = [NSMutableArray array];
    for (CBService* includedService in service.includedServices) {
        NSDictionary* serviceInfo = [self buildServiceInfo:includedService];
        [includedServicesInfo addObject:serviceInfo];
    }
    
    NSString* serviceId = [self serviceIdFromService:service];
    [self callAndClear:_getIncludedServicesCallbacks withInstanceId:serviceId array:includedServicesInfo error:error];
}

- (void)peripheral:(CBPeripheral *)peripheral didDiscoverCharacteristicsForService:(CBService *)service error:(NSError *)error
{
    NSMutableArray* characteristicsInfo = [NSMutableArray array];
    for (CBCharacteristic* characteristic in service.characteristics) {
        NSDictionary* characteristicInfo = [self buildCharacteristicInfo:characteristic];
        [characteristicsInfo addObject:characteristicInfo];
    }
    
    NSString* serviceId = [self serviceIdFromService:service];
    [self callAndClear:_getCharacteristicsCallbacks withInstanceId:serviceId array:characteristicsInfo error:error];
}

- (void)peripheral:(CBPeripheral *)peripheral didUpdateValueForCharacteristic:(CBCharacteristic *)characteristic error:(NSError *)error
{
    NSDictionary* characteristicInfo = [self buildCharacteristicInfo:characteristic];
    NSMutableArray* multipartMessage = [@[
        characteristicInfo[@"uuid"],
        characteristicInfo[@"service"],
        characteristicInfo[@"properties"],
        characteristicInfo[@"instanceId"],
    ] mutableCopy];
    
    if (characteristic.value) {
        [multipartMessage addObject:characteristic.value];
    }
    
    NSString* characteristicId = [self characteristicIdFromCharacteristic:characteristic];
    [self callAndClear:_readCharacteristicValueCallbacks withInstanceId:characteristicId array:multipartMessage error:error];
    
    if (characteristic.isNotifying) {
        [_plugin sendCharacteristicValueChangedEvent:multipartMessage];
    }
}

- (void)peripheral:(CBPeripheral *)peripheral didWriteValueForCharacteristic:(CBCharacteristic *)characteristic error:(NSError *)error
{
    NSString* characteristicId = [self characteristicIdFromCharacteristic:characteristic];
    [self callAndClear:_writeCharacteristicValueCallbacks withInstanceId:characteristicId error:error];
}

- (void)peripheral:(CBPeripheral *)peripheral didUpdateNotificationStateForCharacteristic:(CBCharacteristic *)characteristic error:(NSError *)error
{
    NSString* characteristicId = [self characteristicIdFromCharacteristic:characteristic];
    if (characteristic.isNotifying) { // start notification
        [self callAndClear:_startCharacteristicNotificationCallbacks withInstanceId:characteristicId error:error];
    } else { // stop notification
        [self callAndClear:_stopCharacteristicNotificationCallbacks withInstanceId:characteristicId error:error];
    }
}

- (void)peripheral:(CBPeripheral *)peripheral didDiscoverDescriptorsForCharacteristic:(CBCharacteristic *)characteristic error:(NSError *)error
{
    NSMutableArray* descriptorsInfo = [NSMutableArray array];
    for (CBDescriptor* descriptor in characteristic.descriptors) {
        [descriptorsInfo addObject:[self buildDescriptorInfo:descriptor]];
    }
    
    NSString* characteristicId = [self characteristicIdFromCharacteristic:characteristic];
    [self callAndClear:_getDescriptorsCallbacks withInstanceId:characteristicId array:descriptorsInfo error:error];
}

- (void)peripheral:(CBPeripheral *)peripheral didUpdateValueForDescriptor:(CBDescriptor *)descriptor error:(NSError *)error
{
    NSDictionary* descriptorInfo = [self buildDescriptorInfo:descriptor];
    
    NSMutableArray* multipartMessage = [@[
        descriptorInfo[@"uuid"],
        descriptorInfo[@"characteristic"],
        descriptorInfo[@"instanceId"],
    ] mutableCopy];
    
    if (descriptor.value) {
        [multipartMessage addObject:descriptor.value];
    }
    
    NSString* descriptorId = [self descriptorIdFromDescriptor:descriptor];
    [self callAndClear:_readDescriptorValueCallbacks withInstanceId:descriptorId array:multipartMessage error:error];
    
    [_plugin sendDescriptorValueChangedEvent:multipartMessage];
}

- (void)peripheral:(CBPeripheral *)peripheral didWriteValueForDescriptor:(CBDescriptor *)descriptor error:(NSError *)error
{
    NSString* descriptorId = [self descriptorIdFromDescriptor:descriptor];
    
    [self callAndClear:_writeCharacteristicValueCallbacks withInstanceId:descriptorId error:error];
}

@end

@implementation ChromeBluetooth

- (CDVPlugin*)initWithWebView:(UIWebView *)theWebView
{
    self = [super initWithWebView:theWebView];
    if (self) {
        _centralManager = [[CBCentralManager alloc] initWithDelegate:self queue:nil options:nil];
        _peripherals = [NSMutableDictionary dictionary];
        _activePeripherals = [NSMutableSet set];
        _isScanning = NO;
    }
    return self;
}

#pragma mark chrome.bluetooth implementations
- (NSDictionary*)getAdapterStateInfo
{
    BOOL isPoweredOn = NO;
    
    if (_centralManager.state == CBCentralManagerStatePoweredOn) {
        isPoweredOn = YES;
    }
    
    return @{
        @"name": [[UIDevice currentDevice] name],
        // getifaddrs() returns 02:00:00:00:00:00 since iOS7
        @"address": @"02:00:00:00:00:00",
        @"discovering": [NSNumber numberWithBool:_isScanning],
        @"available": [NSNumber numberWithBool:isPoweredOn],
        @"powered": [NSNumber numberWithBool:isPoweredOn],
    };
}

- (void)getAdapterState:(CDVInvokedUrlCommand*)command
{
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:[self getAdapterStateInfo]] callbackId:command.callbackId];
    
}

- (void)getDevice:(CDVInvokedUrlCommand*)command
{
    NSString* deviceAddress = [command argumentAtIndex:0];
 
    ChromeBluetoothPeripheral* chromePeripheral = _peripherals[deviceAddress];
        
    if (chromePeripheral) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:[chromePeripheral getDeviceInfo]] callbackId:command.callbackId];
    } else {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
    }
}

- (void)getDevices:(CDVInvokedUrlCommand*)command
{
    NSArray *allPeripherals = [_peripherals allValues];
    NSMutableArray *allDeviceInfo = [NSMutableArray array];
    
    for (ChromeBluetoothPeripheral* peripheral in allPeripherals) {
        [allDeviceInfo addObject:[peripheral getDeviceInfo]];
    }
    
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:allDeviceInfo] callbackId:command.callbackId];
}

- (void)startDiscovery:(CDVInvokedUrlCommand *)command
{
    if (!_isScanning) {
        [_centralManager scanForPeripheralsWithServices:nil options:@{CBCentralManagerScanOptionAllowDuplicatesKey : @NO}];
        [_removedDeviceTimer invalidate];
        _removedDeviceTimer = [NSTimer scheduledTimerWithTimeInterval:REMOVED_DEVICE_CHECKING_INTERVAL target:self selector:@selector(checkRemovedDevice:) userInfo:nil repeats:YES];
        _isScanning = YES;
        [self sendAdapterStateChangedEvent:[self getAdapterStateInfo]];
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
    } else {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Bluetooth adapter is scanning"] callbackId:command.callbackId];
    }
}

- (void)stopDiscovery:(CDVInvokedUrlCommand *)command
{
    if (_isScanning) {
        [_removedDeviceTimer invalidate];
        [_centralManager stopScan];
        [_activePeripherals removeAllObjects];
        _isScanning = NO;
        [self sendAdapterStateChangedEvent:[self getAdapterStateInfo]];
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
    } else {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Bluetooth adapter is not scanning"] callbackId:command.callbackId];
    }
}

- (void)restartScanner
{
    if (_isScanning) {
        [_centralManager stopScan];
        [_centralManager scanForPeripheralsWithServices:nil options:@{CBCentralManagerScanOptionAllowDuplicatesKey : @NO}];
    }
}

- (void)registerBluetoothEvents:(CDVInvokedUrlCommand *)command
{
    _bluetoothCallbackId = command.callbackId;
}

- (void)sendAdapterStateChangedEvent:(NSDictionary*)adapterStateInfo
{
    NSArray* eventResult = @[@"onAdapterStateChanged", adapterStateInfo];
    CDVPluginResult* adapterStateChangedResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsMultipart:eventResult];
    [adapterStateChangedResult setKeepCallbackAsBool:YES];
    [self.commandDelegate sendPluginResult:adapterStateChangedResult callbackId:_bluetoothCallbackId];
}

- (void)sendDeviceAddedEvent:(NSDictionary*)deviceInfo
{
    NSArray* eventResult = @[@"onDeviceAdded", deviceInfo];
    CDVPluginResult* deviceAddedResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsMultipart:eventResult];
    [deviceAddedResult setKeepCallbackAsBool:YES];
    [self.commandDelegate sendPluginResult:deviceAddedResult callbackId:_bluetoothCallbackId];
}

- (void)sendDeviceChangedEvent:(NSDictionary*)deviceInfo
{
    NSArray* eventResult = @[@"onDeviceChanged", deviceInfo];
    CDVPluginResult* deviceChangedResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsMultipart:eventResult];
    [deviceChangedResult setKeepCallbackAsBool:YES];
    [self.commandDelegate sendPluginResult:deviceChangedResult callbackId:_bluetoothCallbackId];
}

- (void)sendDeviceRemovedEvent:(NSDictionary*)deviceInfo
{
    NSArray* eventResult = @[@"onDeviceRemoved", deviceInfo];
    CDVPluginResult* deviceRemovedResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsMultipart:eventResult];
    [deviceRemovedResult setKeepCallbackAsBool:YES];
    [self.commandDelegate sendPluginResult:deviceRemovedResult callbackId:_bluetoothCallbackId];
}

// There is no remove device events on iOS. This method checks whether some devices did not advertise
// in a fixed period of time, and declare the device is removed.
// We are polling the bluetooth advertisement data and schedule this method at a fixed rate; therefore,
// it will be more efficient if we don't send remove event.
- (void)checkRemovedDevice:(id)sender
{
    NSArray* activeDeviceAddrs = [_activePeripherals allObjects];
    NSMutableArray* removedDeviceAddrs = [[_peripherals allKeys] mutableCopy];
    [removedDeviceAddrs removeObjectsInArray:activeDeviceAddrs];
    [_activePeripherals removeAllObjects];
    
    for (NSString* deviceAddr in removedDeviceAddrs) {
        ChromeBluetoothPeripheral* peripheral = _peripherals[deviceAddr];
        [self sendDeviceRemovedEvent:[peripheral getDeviceInfo]];
        [peripheral cleanup];
        [_peripherals removeObjectForKey:deviceAddr];
    }
    [self restartScanner];
}

- (void)callAndClear:(__strong id*)block withError:(NSError*)error
{
    void (^callback)(NSError*) = *block;
    if (callback != nil) {
        *block = nil;
        callback(error);
    }   
}

#pragma mark CBCentralManagerDelegate methods

- (void)centralManagerDidUpdateState:(CBCentralManager *)central
{
    [self sendAdapterStateChangedEvent:[self getAdapterStateInfo]];
    
    if (_centralManager.state != CBCentralManagerStatePoweredOn) {
        for (NSString* address in _peripherals) {
            [_peripherals[address] cleanup];
        }
        [_peripherals removeAllObjects];       
    }
}

- (void)centralManager:(CBCentralManager *)central didDiscoverPeripheral:(CBPeripheral *)peripheral advertisementData:(NSDictionary *)advertisementData RSSI:(NSNumber *)RSSI
{
    NSString* address = [ChromeBluetoothPeripheral peripheralAddressFromUUID:peripheral.identifier];
    [_activePeripherals addObject:address];
    
    ChromeBluetoothPeripheral* foundPeripheral = _peripherals[address];
    if (foundPeripheral) {
        foundPeripheral->_adData = advertisementData;
        foundPeripheral->_RSSI = RSSI;
        return;
    }
   
    ChromeBluetoothPeripheral* chromePeripheral = [[ChromeBluetoothPeripheral alloc] initWithPeripheral:peripheral adData:advertisementData RSSI:RSSI plugin:self];
    
    _peripherals[address] = chromePeripheral;
    
    [self sendDeviceAddedEvent:[chromePeripheral getDeviceInfo]];
}

- (void)centralManager:(CBCentralManager *)central didConnectPeripheral:(CBPeripheral *)peripheral
{
    ChromeBluetoothPeripheral* chromePeripheral = _peripherals[[ChromeBluetoothPeripheral peripheralAddressFromUUID:peripheral.identifier]];
    if (!chromePeripheral)
        return;
    
    VERBOSE_LOG(@"Device %@ connected", [chromePeripheral peripheralAddress]);
    
    [self sendDeviceChangedEvent:[chromePeripheral getDeviceInfo]];
    
    [peripheral discoverServices:nil];
    
    [self callAndClear:&(chromePeripheral->_connectCallback) withError:nil];
}

- (void)centralManager:(CBCentralManager *)central didFailToConnectPeripheral:(CBPeripheral *)peripheral error:(NSError *)error
{
    ChromeBluetoothPeripheral* chromePeripheral = _peripherals[[ChromeBluetoothPeripheral peripheralAddressFromUUID:peripheral.identifier]];
    if (!chromePeripheral)
        return;
 
    [self callAndClear:&(chromePeripheral->_connectCallback) withError:error];
}

- (void)centralManager:(CBCentralManager *)central didDisconnectPeripheral:(CBPeripheral *)peripheral error:(NSError *)error
{
    ChromeBluetoothPeripheral* chromePeripheral = _peripherals[[ChromeBluetoothPeripheral peripheralAddressFromUUID:peripheral.identifier]];
    if (!chromePeripheral)
        return;

    VERBOSE_LOG(@"Device %@ disconnected", [chromePeripheral peripheralAddress]);
   
    [self sendDeviceChangedEvent:[chromePeripheral getDeviceInfo]];

    [self callAndClear:&(chromePeripheral->_disconnectCallback) withError:error];
}

#pragma mark chrome.bluetoothLowEnergy implementations

- (void)connect:(CDVInvokedUrlCommand*)command
{
    NSString* deviceAddress = [command argumentAtIndex:0];
    
    ChromeBluetoothPeripheral* chromePeripheral = _peripherals[deviceAddress];
    if (!chromePeripheral) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
        return;
    }
  
    NSNumber* isConnectable = chromePeripheral->_adData[CBAdvertisementDataIsConnectable];
    if (isConnectable && ![isConnectable boolValue]) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Device is not connectable"] callbackId:command.callbackId];
        return;
    }
    
    id<CDVCommandDelegate> commandDelegate = self.commandDelegate;
    chromePeripheral->_connectCallback = [^(NSError* error) {
        if (error) {
            [commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:[error localizedDescription]] callbackId:command.callbackId];
        } else {
            [commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
        }
    } copy];
    
    [_centralManager connectPeripheral:chromePeripheral->_peripheral options:nil];
}

- (void)disconnectPeripheral:(CBPeripheral *)peripheral
{
    [_centralManager cancelPeripheralConnection:peripheral];
}

- (void)disconnect:(CDVInvokedUrlCommand*)command
{
    NSString* deviceAddress = [command argumentAtIndex:0];
    
    ChromeBluetoothPeripheral* chromePeripheral = _peripherals[deviceAddress];
    if (!chromePeripheral) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
        return;
    }
    
    id<CDVCommandDelegate> commandDelegate = self.commandDelegate;
    chromePeripheral->_disconnectCallback = [^(NSError* error) {
        if (error) {
            [commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:[error localizedDescription]] callbackId:command.callbackId];
        } else {
            [commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
        }
    } copy];
    
    [chromePeripheral cleanup];
    [self disconnectPeripheral:chromePeripheral->_peripheral];
}

- (void)getService:(CDVInvokedUrlCommand*)command
{
    NSString* serviceId = [command argumentAtIndex:0];
    NSString* deviceAddress = [serviceId componentsSeparatedByString:@"/"][0];
    
    ChromeBluetoothPeripheral* chromePeripheral = _peripherals[deviceAddress];
    
    if (!chromePeripheral.isConnected) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Bluetooth is not connected"] callbackId:command.callbackId];
        return;
    }
    
    NSDictionary *serviceInfo = [chromePeripheral getServiceInfoByServiceId:serviceId];
    
    if (serviceInfo) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:serviceInfo] callbackId:command.callbackId];
    } else {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
    }
}

- (void)getServices:(CDVInvokedUrlCommand*)command
{
    NSString* deviceAddress = [command argumentAtIndex:0];
    
    ChromeBluetoothPeripheral* chromePeripheral = _peripherals[deviceAddress];
    if (!chromePeripheral) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
        return;
    }
    
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:[chromePeripheral getServicesInfo]] callbackId:command.callbackId];
}

- (void)getCharacteristic:(CDVInvokedUrlCommand*)command
{
    NSString* characteristicId = [command argumentAtIndex:0];
    NSString* deviceAddress = [characteristicId componentsSeparatedByString:@"/"][0];
    
    ChromeBluetoothPeripheral* chromePeripheral = _peripherals[deviceAddress];
    
    if (!chromePeripheral) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
        return;
    }
    
    NSDictionary* characteristicInfo = [chromePeripheral getCharacteristicInfoByCharacteristicId:characteristicId];
    NSData* characteristicValue = [chromePeripheral getCharacteristicValueByCharacteristicId:characteristicId];
    
    if (!characteristicInfo) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
        return;
    }
    
    NSMutableArray* multipartMessage = [@[
        characteristicInfo[@"uuid"],
        characteristicInfo[@"service"],
        characteristicInfo[@"properties"],
        characteristicInfo[@"instanceId"],
    ] mutableCopy];
    
    if (characteristicValue) {
        [multipartMessage addObject:multipartMessage];
    }
   
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsMultipart:multipartMessage] callbackId:command.callbackId];
}

- (void)getCharacteristics:(CDVInvokedUrlCommand*)command
{
    NSString* serviceId = [command argumentAtIndex:0];
    NSString* deviceAddress = [serviceId componentsSeparatedByString:@"/"][0];
    
    ChromeBluetoothPeripheral* chromePeripheral = _peripherals[deviceAddress];
    
    if (!chromePeripheral) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
        return;
    }
    
    id<CDVCommandDelegate> commandDelegate = self.commandDelegate;
    chromePeripheral->_getCharacteristicsCallbacks[serviceId] = [^(NSArray* characteristicsInfo, NSError* error){
        if (error) {
            [commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:[error localizedDescription]] callbackId:command.callbackId];
        } else {
            [commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:characteristicsInfo] callbackId:command.callbackId];
        }
    } copy];

    if (![chromePeripheral discoveryCharacteristicsByServiceId:serviceId]) {
        [chromePeripheral->_getCharacteristicsCallbacks removeObjectForKey:serviceId];
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
    }
}

- (void)getIncludedServices:(CDVInvokedUrlCommand*)command
{
    NSString* serviceId = [command argumentAtIndex:0];
    NSString* deviceAddress = [serviceId componentsSeparatedByString:@"/"][0];
    
    ChromeBluetoothPeripheral* chromePeripheral = _peripherals[deviceAddress];
    
    if (!chromePeripheral) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
        return;
    }
   
    id<CDVCommandDelegate> commandDelegate = self.commandDelegate;
    chromePeripheral->_getIncludedServicesCallbacks[serviceId] = [^(NSArray* includedServicesInfo, NSError* error){
        if (error) {
            [commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:[error localizedDescription]] callbackId:command.callbackId];
        } else {
            [commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:includedServicesInfo] callbackId:command.callbackId];
        }
    } copy];
    
    if (![chromePeripheral discoveryIncludedServicesByServiceId:serviceId]) {
        [chromePeripheral->_getIncludedServicesCallbacks removeObjectForKey:serviceId];
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
    }
    
}

- (void)getDescriptor:(CDVInvokedUrlCommand*)command
{
    NSString* descriptorId = [command argumentAtIndex:0];
    NSString* deviceAddress = [descriptorId componentsSeparatedByString:@"/"][0];
    
    ChromeBluetoothPeripheral* chromePeripheral = _peripherals[deviceAddress];
    
    if (!chromePeripheral) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
        return;
    }
    
    NSDictionary* descriptorInfo = [chromePeripheral getDescriptorInfoByDescriptorId:descriptorId];
    NSData* descriptorValue = [chromePeripheral getDescriptorValueByDescriptorId:descriptorId];
    
    if (!descriptorInfo) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
        return;
    }
    
    NSMutableArray* multipartMessage = [@[
        descriptorInfo[@"uuid"],
        descriptorInfo[@"characteristic"],
        descriptorInfo[@"instanceId"],                                      
    ] mutableCopy];
    
    if (descriptorValue) {
        [multipartMessage addObject:descriptorValue];
    }
    
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsMultipart:multipartMessage] callbackId:command.callbackId];
}

- (void)getDescriptors:(CDVInvokedUrlCommand*)command
{
    NSString* characteristicId = [command argumentAtIndex:0];
    NSString* deviceAddress = [characteristicId componentsSeparatedByString:@"/"][0];
    
    ChromeBluetoothPeripheral* chromePeripheral = _peripherals[deviceAddress];
    
    if (!chromePeripheral) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
        return;
    }
    
    id<CDVCommandDelegate> commandDelegate = self.commandDelegate;
    chromePeripheral->_getDescriptorsCallbacks[characteristicId] = [^(NSArray* descriptorsInfo, NSError* error){
        if (error) {
            [commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:[error localizedDescription]] callbackId:command.callbackId];
        } else {
            [commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:descriptorsInfo] callbackId:command.callbackId];
        }
    } copy];
    
    if (![chromePeripheral discoveryDescriptorByCharacteristicId:characteristicId]) {
        [chromePeripheral->_getDescriptorsCallbacks removeObjectForKey:characteristicId];
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
    }
}

- (void)readCharacteristicValue:(CDVInvokedUrlCommand*)command
{
    NSString* characteristicId = [command argumentAtIndex:0];
    NSString* deviceAddress = [characteristicId componentsSeparatedByString:@"/"][0];
    
    ChromeBluetoothPeripheral* chromePeripheral = _peripherals[deviceAddress];
    
    if (!chromePeripheral) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
        return;
    }
    
    id<CDVCommandDelegate> commandDelegate = self.commandDelegate;
    chromePeripheral->_readCharacteristicValueCallbacks[characteristicId] = [^(NSArray* characteristicMultipartInfo, NSError* error){
        if (error) {
            [commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:[error localizedDescription]] callbackId:command.callbackId];
        } else {
            [commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsMultipart:characteristicMultipartInfo] callbackId:command.callbackId];
        }
    } copy];
    
    if(![chromePeripheral readCharacteristicValueByCharacteristicId:characteristicId]) {
        [chromePeripheral->_readCharacteristicValueCallbacks removeObjectForKey:characteristicId];
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
    }
}

- (void)writeCharacteristicValue:(CDVInvokedUrlCommand*)command
{
    NSString* characteristicId = [command argumentAtIndex:0];
    NSData* value = [command argumentAtIndex:1];
    NSString* deviceAddress = [characteristicId componentsSeparatedByString:@"/"][0];
    
    ChromeBluetoothPeripheral* chromePeripheral = _peripherals[deviceAddress];
    
    if (!chromePeripheral) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
        return;
    }
    
    id<CDVCommandDelegate> commandDelegate = self.commandDelegate;
    chromePeripheral->_writeCharacteristicValueCallbacks[characteristicId] = [^(NSError* error){
        if (error) {
            [commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:[error localizedDescription]] callbackId:command.callbackId];
        } else {
            [commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
        }
    } copy];
 
    if (![chromePeripheral writeCharacteristicValueByCharacteristicId:characteristicId value:value]) {
        [chromePeripheral->_readCharacteristicValueCallbacks removeObjectForKey:characteristicId];
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
    }
}

- (void)startCharacteristicNotifications:(CDVInvokedUrlCommand*)command
{
    NSString* characteristicId = [command argumentAtIndex:0];
    NSString* deviceAddress = [characteristicId componentsSeparatedByString:@"/"][0];
    
    ChromeBluetoothPeripheral* chromePeripheral = _peripherals[deviceAddress];
    
    if (!chromePeripheral) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
        return;
    }
    
    id<CDVCommandDelegate> commandDelegate = self.commandDelegate;
    chromePeripheral->_startCharacteristicNotificationCallbacks[characteristicId] = [^(NSError* error){
        if (error) {
            [commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:[error localizedDescription]] callbackId:command.callbackId];
        } else {
            [commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
        }
    } copy];
    
    if (![chromePeripheral setCharacteristicNotificationValue:YES CharacteristicId:characteristicId]) {
        [chromePeripheral->_startCharacteristicNotificationCallbacks removeObjectForKey:characteristicId];
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
    }
}

- (void)stopCharacteristicNotifications:(CDVInvokedUrlCommand*)command
{
    NSString* characteristicId = [command argumentAtIndex:0];
    NSString* deviceAddress = [characteristicId componentsSeparatedByString:@"/"][0];

    ChromeBluetoothPeripheral* chromePeripheral = _peripherals[deviceAddress];
    
    if (!chromePeripheral) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
        return;
    }

    id<CDVCommandDelegate> commandDelegate = self.commandDelegate;
    chromePeripheral->_stopCharacteristicNotificationCallbacks[characteristicId] = [^(NSError* error){
        if (error) {
            [commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:[error localizedDescription]] callbackId:command.callbackId];
        } else {
            [commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
        }
    } copy];
    
    if (![chromePeripheral setCharacteristicNotificationValue:NO CharacteristicId:characteristicId]) {
        [chromePeripheral->_stopCharacteristicNotificationCallbacks removeObjectForKey:characteristicId];
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
    }
}

- (void)readDescriptorValue:(CDVInvokedUrlCommand*)command
{
    NSString* descriptorId = [command argumentAtIndex:0];
    NSString* deviceAddress = [descriptorId componentsSeparatedByString:@"/"][0];
    
    ChromeBluetoothPeripheral* chromePeripheral = _peripherals[deviceAddress];
    
    if (!chromePeripheral) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
        return;
    }
    
    id<CDVCommandDelegate> commandDelegate = self.commandDelegate;
    chromePeripheral->_readDescriptorValueCallbacks[descriptorId] = [^(NSArray* multipartMessage, NSError* error) {
        if (error) {
            [commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:[error localizedDescription]] callbackId:command.callbackId];
        } else {
            [commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsMultipart:multipartMessage] callbackId:command.callbackId];
        }
    } copy];

    if (![chromePeripheral readDescriptorValueByDescriptorId:descriptorId]) {
        [chromePeripheral->_readDescriptorValueCallbacks removeObjectForKey:descriptorId];
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
    }
}

- (void)writeDescriptorValue:(CDVInvokedUrlCommand*)command
{
    NSString* descriptorId = [command argumentAtIndex:0];
    NSData* value = [command argumentAtIndex:1];
    NSString* deviceAddress = [descriptorId componentsSeparatedByString:@"/"][0];
    
    ChromeBluetoothPeripheral* chromePeripheral = _peripherals[deviceAddress];
    
    if (!chromePeripheral) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
        return;
    }
    
    id<CDVCommandDelegate> commandDelegate = self.commandDelegate;
    chromePeripheral->_writeDescriptorValueCallbacks[descriptorId] = [^(NSError* error){
        if (error) {
            [commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:[error localizedDescription]] callbackId:command.callbackId];
        } else {
            [commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
        }
    } copy];
    
    if (![chromePeripheral writeDescriptorValueByDescriptorId:descriptorId value:value]) {
        [chromePeripheral->_writeDescriptorValueCallbacks removeObjectForKey:descriptorId];
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid Argument"] callbackId:command.callbackId];
    }
}

- (void)registerBluetoothLowEnergyEvents:(CDVInvokedUrlCommand *)command
{
    _bluetoothLowEnergyCallbackId = command.callbackId;
}

- (void)sendServiceAddedEvent:(NSDictionary*)serviceInfo
{
    NSArray* eventResult = @[@"onServiceAdded", serviceInfo];
    CDVPluginResult* serviceAddedResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsMultipart:eventResult];
    [serviceAddedResult setKeepCallbackAsBool:YES];
    [self.commandDelegate sendPluginResult:serviceAddedResult callbackId:_bluetoothLowEnergyCallbackId];
}

- (void)sendServiceChangedEvent:(NSDictionary*)serviceInfo
{
    NSArray* eventResult = @[@"onServiceChanged", serviceInfo];
    CDVPluginResult* serviceChangedResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsMultipart:eventResult];
    [serviceChangedResult setKeepCallbackAsBool:YES];
    [self.commandDelegate sendPluginResult:serviceChangedResult callbackId:_bluetoothLowEnergyCallbackId];
}

- (void)sendServiceRemovedEvent:(NSDictionary*)serviceInfo
{
    NSArray* eventResult = @[@"onServiceRemoved", serviceInfo];
    CDVPluginResult* serviceRemovedResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsMultipart:eventResult];
    [serviceRemovedResult setKeepCallbackAsBool:YES];
    [self.commandDelegate sendPluginResult:serviceRemovedResult callbackId:_bluetoothLowEnergyCallbackId];
}

- (void)sendCharacteristicValueChangedEvent:(NSArray*)characteristicInfo
{
    NSArray* eventResult = [@[@"onCharacteristicValueChanged"] arrayByAddingObjectsFromArray:characteristicInfo];
    CDVPluginResult* characteristicValueChangedResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsMultipart:eventResult];
    [characteristicValueChangedResult setKeepCallbackAsBool:YES];
    [self.commandDelegate sendPluginResult:characteristicValueChangedResult callbackId:_bluetoothLowEnergyCallbackId];
}

- (void)sendDescriptorValueChangedEvent:(NSArray*)descriptorInfo
{
    NSArray* evnetResult = [@[@"onDescriptorValueChanged"] arrayByAddingObjectsFromArray:descriptorInfo];
    CDVPluginResult* descriptorValueChangedResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsMultipart:evnetResult];
    [descriptorValueChangedResult setKeepCallbackAsBool:YES];
    [self.commandDelegate sendPluginResult:descriptorValueChangedResult callbackId:_bluetoothLowEnergyCallbackId];
}

@end