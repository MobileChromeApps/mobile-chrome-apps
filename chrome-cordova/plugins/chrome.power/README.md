# chrome.power Plugin

This plugin provides the ability to override the device's default power management.

## Status

Stable on Android and iOS.

## Reference

The API reference is [here](http://developer.chrome.com/apps/power.html).

## Notes

* There is no distinction between `system` and `display` levels; both act as though `display` was specified.

# Release Notes
## 1.0.3 (October 21, 2014)
- Documentation updates.

## 1.0.2 (August 21, 2014)
- Added system level for Android
- Added support for system requestKeepAwake on Android

## 1.0.1 (May 8, 2014)
- requestKeepAwake and releaseKeepAwake to run on the UI thread on Android.
