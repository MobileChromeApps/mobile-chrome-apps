# chrome.syncFileSystem Plugin

This plugin allows apps to access a file system that syncs to Google Drive.

## Status

Alpha on Android and iOS.  Use this plugin at your own risk!

## Reference

The API reference is [here](https://developer.chrome.com/apps/syncFileSystem.html).

## Registering Your App

This plugin depends on the [chrome.identity plugin](), so the corresponding steps must be taken.

In addition, the Drive API must be enabled.  On the left sidebar, navigate to "APIs & Auth" > "APIs" and turn on the Drive API.

## Notes

* Only the manual resolution policy is supported.
* getUsageAndQuota, getFileStatus, and onServiceStatusChanged are not yet implemented.
* DirectoryEntry.getFile triggers a sync even when an existing file is retrieved.
* Failed sync uploads are not currently retried (until another change triggers another sync attempt).
* FileEntry.moveTo and FileEntry.copyTo do not trigger syncs.
