# Chrome Google Cloud Messaging V2 Plugin

This plugin allows Android apps to send/receive push messages.

## Status

Supported on Android

## Reference

The API reference is [here](https://developer.chrome.com/apps/gcm), and a full description on how to set up Google Cloud Messaging is [here](https://developer.chrome.com/apps/cloudMessaging).

## Dependencies

* chrome.storage

## Notes

* Currently only a single registration is permitted per application, and a registration can only be for a single sender id
* The sender ID and registration is cached in local storage
* You require the 'gcm' permission to use this API

# Release Notes
## 1.0.2 (October 21, 2014)
- Correct apparent copy/paste bug.
- Documentation updates.

## 1.0.1 (September 24, 2014)
- Fix #287 #290 Fix several significant GCM bugs

## 1.0.0 (May 8, 2014)
- Initial Release
