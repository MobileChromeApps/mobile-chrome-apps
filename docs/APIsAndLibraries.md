# Chrome Apps APIs and Libraries

## APIs

See the [reference guide for building Chrome Packaged Apps](http://developer.chrome.com/apps/about_apps.html) on desktop.

This list tracks API support on mobile.

_Current as of July 2014_.

### Chrome Apps APIs

* [alarms](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.alarms) - run tasks periodically
    * Working on Android and iOS.
    * Caveat: on iOS alarms only fire when app is active (foreground).
* [fileSystem](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.fileSystem)
    * Exists but is buggy. Requires attention.
* [gcm](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.gcm) - receive push messages from your server
    * Working on Android only
    * Some caveats at the moment (see README)
* [i18n](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.i18n) - change your app's strings based on locale
    * JS methods work (`chrome.i18n.getMessage()` and `chrome.i18n.getAcceptLanguages()`).
    * CSS placeholders not implemented.
* [identity](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.identity) -  sign-in users using OAuth2 without the need for a password
    * Working on Android and iOS.
    * iOS requires Google+ app for password-less login.
* [idle](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.idle) - detect when the machine's idle state changes
    * Working on Android and iOS.
    * Doesn't detect system idle. Only app idle.
* [notifications](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.notifications) - create local notifications
    * Working on Android only.
* [power](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.power) - prevent device from sleeping
    * Working on Android and iOS.
* [pushMessaging](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.pushMessaging) - receive push messages from your server
    * Beta quality on Android and iOS.
* [socket](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.socket) - send and receive data over the network using TCP and UDP
    * Working on Android and iOS.
    * New socket APIs (`chrome.socket.tcp`, `chrome.socket.udp`, `chrome.socket.tcpServer` not implemented)
* [storage](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.storage) - store and retrieve key-value data locally
    * Working on Android and iOS.
    * `chrome.storage.sync` storage does not sync, but works like `chrome.storage.local`.
* [syncFileSystem](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.syncFileSystem) - store and retrieve files backed by Google Drive
    * Alpha quality on iOS and Android (not currently being worked on)
    * Does not sync when app is not running.
* [system.cpu](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.system.cpu) - query basic CPU information of the system
    * Working on Android and iOS.
* [system.display](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.system.display) - query display metadata
    * Alpha quality on Android and iOS.
* [system.memory](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.system.memory) - get physical memory information
    * Working on Android and iOS.
* [system.network](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.system.network) - retrieves information about local network adapters
    * Working on Android and iOS.
* [system.storage](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.system.storage) - query storage device information and be notified when a removable storage device is attached and detached.
    * Alpha quality on Android only

### Other APIs

* [payments](https://github.com/MobileChromeApps/mobile-chrome-apps/blob/master/chrome-cordova/plugins/google.payments) - sell virtual goods within your mobile app
    * Working on Android and iOS.
    * Requires manual steps for App Store / Play Store registration.
* [audioCapture](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.audioCapture) - capture audio directly from the user's Microphone via the getUserMedia API.
    * Working on Android only.
* [videoCapture](https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/chrome-cordova/plugins/chrome.videoCapture) - capture video directly from the user's Web Cam via the getUserMedia API.
    * Working on Android only.

### APIs Coming in the Near Term
* chrome.sockets.tcp / udp / tcpServer
* runtime.getPackageDirectoryEntry
* mediaGalleries
* Better notifications and alarms support

### APIs Coming in the Medium Term
* bluetooth
* app.window.*
* fileSystem (fixes)
* system.*
* location

### APIs Coming in the Long Term
* commands
* contextMenus
* permissions
* tts
* usb
* accessibilityFeatures
* audio
* hid
* wallpaper
* webstore
* webview tag

## Libraries

This is, of course, not an exhaustive list!  More will be added as we find them—don't hesitate to contact us if you know of a great, useful library.

* [Chrome Platform Analytics](https://github.com/GoogleChrome/chrome-platform-analytics)
    * Adds Google Analytics support for Chrome Apps.
* [Resource Loader](https://github.com/GoogleChrome/apps-resource-loader)
    * Simplifies loading external resources (such as images).

