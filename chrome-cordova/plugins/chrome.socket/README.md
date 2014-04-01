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
## 1.1.2 (April 1, 2014)
- Fixed `getNetworkList()` on Android to match desktop's implementation.
- Moved connecting into its own thread.

## 1.1.1 (March 10, 2014)
- Fix TCP chrome.socket.read behavior for reads smaller than the requested read size (Issue #64)
- Allow chrome.socket.read for connected UDP socket
- Support null bufferSize for read and recvFrom
- Fixing reading when buffer is larger than available data
