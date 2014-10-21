# chrome.system.display Plugin

This plugin provides the ability to query display metadata.

## Status

Alpha quality on Android and iOS.

## Caveats

### Android

`chrome.system.display.getInfo` is the only method to be implemented for now.
Please be aware that `mirroringSourceId`, `isInternal` and `isEnabled` cannot
be retrieved.

### iOS

`chrome.system.display.getInfo` is the only method currently implemented:
* The properties `dpiX` and `dpiY` are approximations
* The properties `mirroringSourceId`, `isInternal` and `isEnabled` are not 
implemented.

## Reference

The API reference is [here](https://developer.chrome.com/apps/system_display).

# Release Notes
## 1.1.0 (October 21, 2014)
- Added support for iOS

## 1.0.0
- Initial release
