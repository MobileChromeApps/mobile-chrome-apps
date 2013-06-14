# Mobile Chrome Packaged App API Implementation Status

Current as of June 2013.

## Well supported APIs

* app.runtime
* app.window
* events
* fileSystem
* experimental.identity
* storage.local
* socket
    * Multicast sockets are not supported
* syncFileSystem
    * Remote deletions may not be noticed by the local device

## Somewhat supported APIs

* alarms
  * Only work while app is actively running.
* storage.sync
  * works like storage.local (ie, storage works, but no sync)
* i18n
* runtime
  * App lifetimes differ on mobile, events map as well as possible
  * Anything related to app store or IPC not supported
 
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