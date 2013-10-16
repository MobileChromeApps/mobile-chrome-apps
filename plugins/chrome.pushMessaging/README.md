# Chrome Push Messaging Plugin

This plugin allows apps to receive push messages.

## Status

In progress on Android; not supported on iOS.

## Reference

The API reference is [here](http://developer.chrome.com/apps/pushMessaging.html).

## Notes

* chrome.pushMessaging.getChannelId returns an object containing both a `channelId` and a `registrationId`.  The `channelId` is used for sending push messagings to instances of the app running on desktop; the `registrationId` is used for sending push messages to instances of the app running on Android.
* On Android, chrome.identity must be modified so that `getAuthToken` uses the javascript flow (getAuthTokenJS) instead of the native exec flow.  Otherwise `getChannelId` will fail to obtain a `channelId` (but will still obtain a `registrationId`).
