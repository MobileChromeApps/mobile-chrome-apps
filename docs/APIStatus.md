# Chrome API Implementation Status

See the [reference guide for building Chrome Packaged Apps](http://developer.chrome.com/apps/about_apps.html) on Desktop.

This list tracks API support on mobile.

_Current as of Jan 2014_.

## Chrome Apps APIs

* [alarms](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.alarms)
    * Working on Android and iOS.
    * Caveat: on iOS alarms only fire when app is active (foreground).
* [fileSystem](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.fileSystem)
    * Working on Android and iOS.
* [i18n](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.i18n)
    * JS methods work (`chrome.i18n.getMessage()` and `chrome.i18n.getAcceptLanguages()`).
    * CSS placeholders not implemented.
* [identity](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.identity)
    * New API in progress.
* [idle](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.idle)
    * Working on Android and iOS.
* [notifications](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.notifications)
    * Working on Android only.
* [power](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.power)
    * Working on Android and iOS.
* [pushMessaging](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.pushMessaging)
    * Beta quality on Android and iOS.
* [socket](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.socket)
    * Working on Android and iOS.
* [storage](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.storage)
    * local storage Working on Android and iOS.
    * sync storage does not sync, but works like storage.local.
* [syncFileSystem](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.syncFileSystem)
    * Beta quality on iOS and Android.

## Other APIs

* [payments](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/google.payments)
    * Alpha quality on iOS and Android.

## Not yet supported APIs

* bluetooth
* commands
* contextMenus
* mediaGalleries
* permissions
* serial
* systemInfo.cpu
* systemInfo.display
* systemInfo.memory
* systemInfo.storage
* tts
* types
* usb
* webstore
* `<webview>` tag
* NaCl

## Unsupported HTML5 APIs

* IndexedDB (except on KitKat)
* `getUserMedia()`
