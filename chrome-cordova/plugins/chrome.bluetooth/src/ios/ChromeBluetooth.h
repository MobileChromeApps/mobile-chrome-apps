@interface ChromeBluetooth : CDVPlugin {
    
}

#pragma mark chrome.bluetoothLowEnergy interface
// chrome.bluetooth and chrome.bluetoothLowEnergy uses same file because connect, and disconnect
// a deivce requires the same instance of CBCentralManager that found the device.

- (void)connect:(CDVInvokedUrlCommand*)command;
- (void)disconnect:(CDVInvokedUrlCommand*)command;
- (void)getService:(CDVInvokedUrlCommand*)command;
- (void)getServices:(CDVInvokedUrlCommand*)command;
- (void)getCharacteristic:(CDVInvokedUrlCommand*)command;
- (void)getCharacteristics:(CDVInvokedUrlCommand*)command;
- (void)getIncludedServices:(CDVInvokedUrlCommand*)command;
- (void)getDescriptor:(CDVInvokedUrlCommand*)command;
- (void)getDescriptors:(CDVInvokedUrlCommand*)command;
- (void)readCharacteristicValue:(CDVInvokedUrlCommand*)command;
- (void)writeCharacteristicValue:(CDVInvokedUrlCommand*)command;
- (void)startCharacteristicNotifications:(CDVInvokedUrlCommand*)command;
- (void)stopCharacteristicNotifications:(CDVInvokedUrlCommand*)command;
- (void)readDescriptorValue:(CDVInvokedUrlCommand*)command;
- (void)writeDescriptorValue:(CDVInvokedUrlCommand*)command;
- (void)registerBluetoothLowEnergyEvents:(CDVInvokedUrlCommand*)command;

@end