# chrome.sockets.tcp Plugin

This plugin provides UDP sockets for Android and iOS.

## Status

Beta on Android and iOS.

## Reference

The API reference is [here](https://developer.chrome.com/apps/sockets_udp).

# Release Notes

## 1.2.0 (November 17, 2014)
* Remove unnecessary headers for chrome.sockets.* - ios
* Fix possible blocks leak memory
* Fixed chrome.sockets.udp socket close with error problem
* Commented out assert that caused app to crash when no network is available.
* chrome.sockets: open selector in selector thread
* Don't modify interest set when key is invalid (fix #388)

## 1.1.0 (October 24, 2014)
* Add `chrome.sockets.secure.tcp` and refactor `chrome.sockets.*`

## 1.0.1 (October 23, 2014)
* Fix a NullPointerException on Android
* Fix the dependency on iosSocketsCommon so that it works with the Cordova plugin registry.

## 1.0.0 (October 21, 2014)
* Initial release
