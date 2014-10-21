# Chrome Push Messaging Plugin

This plugin allows apps to receive push messages.

## Status

Supported on Android and iOS.

## Reference

The API reference is [here](http://developer.chrome.com/apps/pushMessaging.html).

## Notes

* chrome.pushMessaging.getChannelId returns an object containing a `channelId`, a `registrationId` and a `deviceToken`.  The `channelId` is used for sending push messagings to instances of the app running on desktop; the `registrationId` is used for sending push messages to instances of the app running on Android; the deviceToken is used to send messages to instances of the app on iOS devices.
* On Android, chrome.identity must be modified so that `getAuthToken` uses the javascript flow (getAuthTokenJS) instead of the native exec flow.  Otherwise `getChannelId` will fail to obtain a `channelId` (but will still obtain a `registrationId`).
* On iOS the token is not application specific, but the messaging system requires a certificate that identifies the application.
* You must install an appropriate auth2 section in your `manifest.json` with suitable `client_id` and `scopes`. Push Messaging requires the scopes:
https://www.googleapis.com/auth/gcm_for_chrome
and
https://www.googleapis.com/auth/gcm_for_chrome.readonly

# Release Notes
## 1.0.2 (October 21, 2014)
- Documentation updates.
