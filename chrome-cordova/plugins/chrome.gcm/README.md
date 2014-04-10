# Chrome Google Cloud Messaging V2 Plugin

This plugin allows Android apps to send/receive push messages.

## Status

Supported on Android

## Reference

The API reference is [here](https://developer.chrome.com/apps/cloudMessagingV2).

## Dependencies

* chrome.storage

## Notes

* Currently only a single registration is permitted per application, and a registration can only be for a single sender id
* The sender ID and registration is cached in local storage
* You require the 'gcm' permission to use this API


