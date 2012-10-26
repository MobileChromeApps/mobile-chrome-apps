# Problems

Here are problems we've discovered while trying to port chrome.* APIs to Cordova.

### `chrome.runtime.id`

This is the ID of the app, presumably the same long hex strings used for the Web Store.
We have no way of knowing this on mobile, unless we get developers to supply it in their `manifest.json` or elsewhere.
It may not always be defined either (prior to uploading, do you have one?).

Andrew also suggested using the app ID, which is a fully qualified object name, eg. `com.google.cordova.apps.ChromeExample`.
However, that means that the app would be unable to use its ID as an identifier to a server, or the Web Store.
I'm not sure if that's important.
