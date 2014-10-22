# chrome.system.storage Plugin

This plugin provides the ability to query storage device information and be notified when a removable storage device is attached and detached.

In general, storage on mobile devices is handled differently than on desktop.
The plugin is designed to provide consistent behaviour with desktop usage, but
there are notable differences.

A summary of the similarities and differences:

- Each mobile device has built-in storage (on both Android and iOS).  This is
    is reported as storage unit, similar to the physical hard drive in a desktop

- Neither Android nor iOS officially support external storage attached via cable,
    like USB devices for desktops.  Instead, both platforms expect only special-purpose
    accessories to be attached by cable (see
    [Android](http://developer.android.com/guide/topics/connectivity/usb/index.html)
    and [iOS](https://developer.apple.com/programs/mfi/))

- Many Android devices will support an SD card for [external storage](http://source.android.com/devices/tech/storage/index.html).
    As of Android 4.4, the SDK has also added support for multiple SD cards.
    If found, the plugin will report any SD card(s) as storage units, similar
    to USB storage devices on desktop


## Status

The implementation of various functionality, across platforms, is summarized in the table below.

| Method / Event | Android | iOS  |
| -------------- |:-------:|:----:|
| getInfo          | Yes     | Yes<sup>1</sup>    |
| ejectDevice      | Yes<sup>2</sup>      | Yes  |
| getAvailableCapacity | Yes      | Yes   |
| onAttached      | Yes      | No-op<sup>3</sup>   |
| onDetached      | Yes      | No-op<sup>3</sup>   |

1. As iOS does not support generic storages devices, nor SD cards, this method
    will only ever return a single storage unit (representing built-in storage).

2. On Android, this method will always return "in use" for any removable storage -
    it is not currently supported to eject/unmount an SD card programmatically.

2. As above, no iOS devices support removable storage. Thus, these events are
    implemented as a no-op (listeners can be attached, but will never be fired).

## Reference

The API reference is [here](https://developer.chrome.com/apps/system_storage).

# Release Notes
## 1.1.0 (October 31, 2014)
- Add Android support for ejectDevice, getAvailableCapacity, onAttached/onDetached
- Add iOS support for all methods/events

## 1.0.1 (October 21, 2014)
- Documentation updates.

## 1.0.0
- Initial release
