# chrome.socket Plugin

This plugin provides client and server sockets for Android and iOS.

## Status

Stable on Android and iOS.

## Reference

The API reference is [here](http://developer.chrome.com/apps/socket.html).

## Notes

* setKeepAlive and setNoDelay are not yet implemented.
* Multicast support is only implemented in Android, and is not yet stable.

# Release Notes

## 1.2.2 (November 17, 2014)
 - Make iossocketcommon a `<dependency>` only for iOS platform

## 1.2.1 (October 23, 2014)
- Fix the dependency on iosSocketsCommon so that it works with the Cordova plugin registry.

## 1.2.0 (October 21, 2014)
- Update to depend on new chrome.system.network and org.chromium.iosSocketsCommon plugins.
- Documentation updates.

## 1.1.3 (August 20, 2014)
- ios: Don't remove sockets from dictionary while iterating over it
- ios: Close open sockets on app reset/shutdown (Fixes #203)
- Remove static members from ChromeSocket on android, so that its not shared across webviews
- Destroy all lingering sockets onStop/onReset
- Add setReuseAddress to chrome.socket server sockets so you can rebind ports
- ios: Fix socket.read() not respecting maxLength
- ios: Make chrome.socket.destroy call disconnect

## 1.1.2 (April 1, 2014)
- Fixed `getNetworkList()` on Android to match desktop's implementation.
- Moved connecting into its own thread.

## 1.1.1 (March 10, 2014)
- Fix TCP chrome.socket.read behavior for reads smaller than the requested read size (Issue #64)
- Allow chrome.socket.read for connected UDP socket
- Support null bufferSize for read and recvFrom
- Fixing reading when buffer is larger than available data
