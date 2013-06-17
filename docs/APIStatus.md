# Mobile Chrome Packaged App API Implementation Status

See the [reference guide for building Chrome Packaged Apps](http://developer.chrome.com/apps/about_apps.html) on Desktop.

This list tracks API support on mobile.

_Current as of June 2013_.

## Well supported APIs

* app.runtime
* app.window
* events
* fileSystem
* experimental.identity
* storage.local
* socket
    * Multicast sockets are not supported

## Somewhat supported APIs

* alarms
    * Only work while app is actively running.
* storage.sync
    * works like storage.local (ie, storage works, but no sync)
* i18n
* runtime
    * App lifetimes differ on mobile, events map as well as possible
    * Anything related to app store or IPC not supported
* syncFileSystem
    * Only the last_write_win conflict resolution policy is supported
    * getUsageAndQuota not supported
    * getFileStatus/getFileStatuses not supported
    * service status listeners not supported
 
## Not yet supported APIs

* bluetooth
* commands
* contextMenus
* idle
* mediaGalleries
* notifications
* permissions
* power
* pushMessaging
* serial
* tts
* types
* usb
* webstore
* experimental.mediaGalleries
* experimental.record
* experimental.systemInfo.cpu
* experimental.systemInfo.display
* experimental.systemInfo.memory
* experimental.systemInfo.storage
* webview
