# chrome.syncFileSystem Plugin

This plugin allows apps to access a file system that syncs to Google Drive.

## Status

Alpha on Android and iOS.  Use this plugin at your own risk!

## Reference

The API reference is [here](https://developer.chrome.com/apps/syncFileSystem.html).

## Registering Your App

This plugin depends on the [chrome.identity plugin](http://plugins.cordova.io/#/package/org.chromium.identity), so the corresponding steps must be taken.

In addition, the Drive API must be enabled.  On the left sidebar, navigate to "APIs & auth" > "APIs" and turn on the Drive API.

## Updating Your Manifest

In addition to the manfest changes for `chrome.identity`, you will need to add the Google Drive scope `https://www.googleapis.com/auth/drive` to the "oauth2" item in your **manifest.json** file. You will also ned to set the "`key`" property of your manifest, in order to share data between instances of the application. See instructions [here](http://developer.chrome.com/apps/manifest/key) for information about how to get that key out of a packed packaged app.

## Notes

* Only the manual resolution policy is supported.
* getUsageAndQuota, getFileStatus, and onServiceStatusChanged are not yet implemented.
* DirectoryEntry.getFile triggers a sync even when an existing file is retrieved.
* Failed sync uploads are not currently retried (until another change triggers another sync attempt).
* FileEntry.moveTo and FileEntry.copyTo do not trigger syncs.

# Release Notes
## 0.1.2 (May 8, 2014)
- Updated documentation.

## 0.1.1 (April 1, 2014)
- Updated documentation.
- Improved error checking and handling.
- Added some internal caching and a function to clear the cache.
- Made callback functions optional.
- Fixed some lint errors.

