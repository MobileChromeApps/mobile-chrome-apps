# chrome.sockets.tcp Plugin

This plugin provides TCP client sockets for Android and iOS.

## Status

Beta on Android and iOS.

## Reference

The API reference is [here](https://developer.chrome.com/apps/sockets_tcp).

# Release Notes

## 1.3.0 (Nov 26, 2014)
* Added mobile-only `chrome.sockets.tcp.pipeToFile` API
* android sockets.tcp: send an error when receive EOF

## 1.2.0 (November 17, 2014)
* Remove unnecessary headers for chrome.sockets.* - ios
* Fix possible blocks leak memory
* sockets.tcp - redirect to file for iOS & Android
* Fixed chrome.sockets.udp socket close with error problem
* chrome.sockets: open selector in selector thread
* Fix auto tests & resumeRead accidentally read paused or unconnected sockets on iOS
* Improve chrome.sockets.tcp throughput for iOS & Android
* Fix setPaused for iOS
* Add setKeepAlive and setNoDelay for Android
* Don't modify interest set when key is invalid (fix #388)

## 1.1.0 (October 24, 2014)
* Add `chrome.sockets.secure.tcp` and refactor `chrome.sockets.*`

## 1.0.1 (October 23, 2014)
* Fix a NullPointerException on Android
* Fix the dependency on iosSocketsCommon so that it works with the Cordova plugin registry.

## 1.0.0 (October 21, 2014)
* Initial release
