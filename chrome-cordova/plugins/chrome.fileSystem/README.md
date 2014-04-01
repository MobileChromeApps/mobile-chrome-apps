# chrome.fileSystem Plugin

This plugin allows apps to access a device's file system.

## Status

Stable on Android and iOS.

## Reference

The API reference is [here](http://developer.chrome.com/apps/fileSystem.html).

## Notes

* restoreEntry, isRestorable, and retainEntry are not supported.
* All files are can be made "writable"; there is not yet any differentiation here.

# Release Notes
## 1.0.1 (April 1, 2014)
- Correctly report error when resolveLocalFileSystemURL fails.

