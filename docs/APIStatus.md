# Mobile Chrome Packaged App API Implementation Status

See the [reference guide for building Chrome Packaged Apps](http://developer.chrome.com/apps/about_apps.html) on Desktop.

This list tracks API support on mobile.

_Current as of Sept 2013_.

* [alarms](https://github.com/MobileChromeApps/chrome-cordova/tree/master/plugins/chrome.alarms)
    * Fully working on Android.
    * iOS - alarms will not fire when App is backgrounded
* [i18n](https://github.com/MobileChromeApps/chrome-cordova/tree/master/plugins/chrome.i18n)
    * JS methods work (`chrome.i18n.getMessage()` and `chrome.i18n.getAcceptLanguages()`)
    * CSS placeholders not implemented
* [identity](https://github.com/MobileChromeApps/chrome-cordova/tree/master/plugins/chrome.identity)
    * Fully working on Android.
    * iOS still a work-in-progress.
* [notifications](https://github.com/MobileChromeApps/chrome-cordova/tree/master/plugins/chrome.notifications)
    * Android only
* [socket](https://github.com/MobileChromeApps/chrome-cordova/tree/master/plugins/chrome.socket)
    * Fully working on Android and iOS
* [storage.local](https://github.com/MobileChromeApps/chrome-cordova/tree/master/plugins/chrome.storage)
    * Fully working on Android and iOS
* [storage.sync](https://github.com/MobileChromeApps/chrome-cordova/tree/master/plugins/chrome.storage)
    * Works like storage.local (ie, storage works, but no sync)
* [syncFileSystem](https://github.com/MobileChromeApps/chrome-cordova/tree/master/plugins/chrome.syncFileSystem)
    * Alpha quality on iOS and Android.

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
* experimental.record
* experimental.systemInfo.cpu
* experimental.systemInfo.display
* experimental.systemInfo.memory
* experimental.systemInfo.storage
* webview
