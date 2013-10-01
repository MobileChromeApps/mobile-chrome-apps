# Chrome Push Messaging Plugin

This plugin allows apps to receive push messages.

## Caveats

* chrome.pushMessaging.getChannelId returns an object containing both a channelId to be used for sending push messagings to instances of the app running on desktop, as well as a registrationId to be used for sending push messages to instances of the app running on android
* On android chrome.identity must be modified so that getAuthToken uses the javascript flow (getAuthTokenJS) instead of the native exec flow, otherwise getChannelId will fail to obtain a channelId (but will still obtain a registrationId)
