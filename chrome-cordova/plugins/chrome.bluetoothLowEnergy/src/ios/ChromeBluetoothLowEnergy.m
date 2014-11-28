#import <Cordova/CDVPlugin.h>
#import "ChromeBluetooth.h"

@interface ChromeBluetoothLowEnergy : CDVPlugin {
}

@property (nonatomic, strong) ChromeBluetooth* bluetoothPlugin;

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

@implementation ChromeBluetoothLowEnergy

- (ChromeBluetooth*)bluetoothPlugin
{
    if (!_bluetoothPlugin) {
        _bluetoothPlugin = [self.commandDelegate getCommandInstance:@"ChromeBluetooth"];
    }
    return _bluetoothPlugin;
}

- (void)connect:(CDVInvokedUrlCommand*)command
{
    [self.bluetoothPlugin connect:command];
}

- (void)disconnect:(CDVInvokedUrlCommand*)command
{
    [self.bluetoothPlugin disconnect:command];
}

- (void)getService:(CDVInvokedUrlCommand*)command
{
    [self.bluetoothPlugin getService:command];
}

- (void)getServices:(CDVInvokedUrlCommand*)command
{
    [self.bluetoothPlugin getServices:command];
}

- (void)getCharacteristic:(CDVInvokedUrlCommand*)command
{
    [self.bluetoothPlugin getCharacteristic:command];
}

- (void)getCharacteristics:(CDVInvokedUrlCommand*)command
{
    [self.bluetoothPlugin getCharacteristics:command];
}

- (void)getIncludedServices:(CDVInvokedUrlCommand*)command
{
    [self.bluetoothPlugin getIncludedServices:command];
}

- (void)getDescriptor:(CDVInvokedUrlCommand*)command
{
    [self.bluetoothPlugin getDescriptor:command];
}

- (void)getDescriptors:(CDVInvokedUrlCommand*)command
{
    [self.bluetoothPlugin getDescriptors:command];
}

- (void)readCharacteristicValue:(CDVInvokedUrlCommand*)command
{
    [self.bluetoothPlugin readCharacteristicValue:command];
}

- (void)writeCharacteristicValue:(CDVInvokedUrlCommand*)command
{
    [self.bluetoothPlugin writeCharacteristicValue:command];
}

- (void)startCharacteristicNotifications:(CDVInvokedUrlCommand*)command
{
    [self.bluetoothPlugin startCharacteristicNotifications:command];
}

- (void)stopCharacteristicNotifications:(CDVInvokedUrlCommand*)command
{
    [self.bluetoothPlugin stopCharacteristicNotifications:command];
}

- (void)readDescriptorValue:(CDVInvokedUrlCommand*)command
{
    [self.bluetoothPlugin readDescriptorValue:command];
}

- (void)writeDescriptorValue:(CDVInvokedUrlCommand*)command
{
    [self.bluetoothPlugin writeDescriptorValue:command];
}

- (void)registerBluetoothLowEnergyEvents:(CDVInvokedUrlCommand*)command
{
    [self.bluetoothPlugin registerBluetoothLowEnergyEvents:command];
}

@end