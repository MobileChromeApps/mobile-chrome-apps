# chrome.sockets.tcpServer Plugin

This plugin provides TCP server sockets for Android and iOS.

## Status

Beta on Android and iOS.

## Reference

The API reference is [here](https://developer.chrome.com/apps/sockets_tcpServer).

# Release Notes

## 1.2.1 (Jan 27, 2015)
* Fix compile errors on cordova-android@3.x (fixes #506)

## 1.2.0 (November 17, 2014)
* Remove unnecessary headers for chrome.sockets.* - ios
* Fix possible blocks leak memory
* Fixed chrome.sockets.udp socket close with error problem
* chrome.sockets: open selector in selector thread
* Don't modify interest set when key is invalid (fix #388)

## 1.1.0 (October 24, 2014)
* Add chrome.sockets.secure.tcp and refactor chrome.sockets.*

## 1.0.1 (October 21, 2014)
* Changed plugin id to be compatible with Cordova plugman

## 1.0.0 (October 21, 2014)
* Initial release
