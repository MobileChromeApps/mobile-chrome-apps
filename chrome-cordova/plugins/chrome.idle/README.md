# chrome.idle Plugin

This plugin provides the ability to listen and check for the idle status of a device.

## Status

Stable on Android and iOS.

## Reference

The API reference is [here](http://developer.chrome.com/apps/idle.html).

## Notes

* The concept of "idle" in this implementation refers to a lack of input to the **app**, not the device.
* The "locked" state is not supported on iOS.

# Release Notes

## 1.0.3 (Jan 27, 2015)
* Fix NPE in ChromeIdle.java

## 1.0.2 (November 17, 2014)
* Minor changes to chrome.idle's "locked" state
* Added a platform check
* Added "locked" status to chrome.idle on Android

## 1.0.1 (October 21, 2014)
- Documentation updates.

