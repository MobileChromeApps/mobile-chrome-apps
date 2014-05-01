# Chrome Google Cloud Messaging V2 Plugin

This plugin allows Android apps to send/receive push messages.

## Status

Supported on Android

## Caveats

### Android

You have to manually change the theme to translucent in `platforms/android/AndroidManifest.xml` by changing `"Theme.Black.NoTitleBar"` to `"Theme.Translucent"` inside your `<activity>` tag.

## Reference

The API reference is [here](https://developer.chrome.com/apps/cloudMessagingV2).

## Dependencies

* chrome.storage

## Notes

* Currently only a single registration is permitted per application, and a registration can only be for a single sender id
* The sender ID and registration is cached in local storage
* You require the 'gcm' permission to use this API


