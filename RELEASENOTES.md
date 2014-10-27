## Release Notes

For detailed release notes for plugins, refer to each plugin's `README.md`.

For Android / iOS detailed release notes, refer to `RELEASENOTES.md` with `cordova/cordova-android` and `cordova/cordova-ios`


### v0.4.3 (Oct 24, 2014)
* Teach cca that org.chromium.system.network is a dep of socket (fixes #381)

### v0.4.2 (Oct 21, 2014)
* Added chrome.sockets.tcp, chrome.sockets.tcpServer, and chrome.sockets.udp APIs for Android and iOS (BETA)
* Added chrome.identity.getProfileUserInfo.
* Added chrome.system.cpu, chrome.system.display, chrome.system.memory, and chrome.system.network for ios
* Added a new APIStatus page to docs
* Add missing files for cca-manifest-logic and update .gitignore
* Added force launch params.
* Removing stale gcm code
* Added a failure when pushing with an unknown flag.
* Improve the way cca run chrome works, as per cordova-browser
* elementtree->xmldom within update-config-xml.js (browser-compatible interface)
* Android: Build fixes in cordova-android:
  * gradle: Allow storeType to be set (allows using .p12 files)
  * gradle: Allow absolute paths to keystore files
  * Fix build for android when app name contains unicode characters.
  * Detect JAVA\_HOME properly on Ubuntu
  * Teach check\_reqs about brew's install location for android SDK
  * Fix --shared flag of create script (broke in recent gradle changes)
* Android: Added multipart PluginResult
* Android: CB-6837 Fix leaked window when hitting back button while alert being rendered

### v0.4.1 (Sep 24, 2014)
* Android: Fix build warning about dynamic properties being deprecated
* Android: Make Android Studio project imports work properly
* Android: Faster builds by building only release/debug for sublibraries
* Android: Even faster builds for `cca run android` by building only one of arm vs x86
* Android: Make it an error to try to build android release without android-release-keys.properties
* Fix cca create failing when not connected to the internet
* Add platforms in one command instead of two (triggers one fewer prepares)

### v0.4.0 (Sep 18, 2014)
* Android: Switched build system to Gradle (no more Ant)
* Android: Now generating smaller APKs via arm/x86-specific builds
* Android: New release signing instructions (now requires a android-release-keys.properties file in project root)
* Android: Update to Crosswalk 8.37.189.0 (based on Chromium 37)
* Android: New command-line flag: cca build --webview=system
* Improvements to checkenv and SDK detection logic
* Added "exec" command to make it easier to run programs that require fix-ups to PATH
* Added Google Analytics
* Added 'cca analytics' to enable/disable usage stats collection
* Fix #300: Error if using cca command inside cordova project
* Fix #304: Automatically set Android Theme
* Fix #315: Add -y flag to skip [y/n] upgrade prompt
* Update Crosswalk-engine plugin to handle file picker (Fixes #263)
* Switch to cordova-ios@3.6.1, updated cordova-android to latest 4.0.x
* Update cordova-crosswalk-engine to fix timers not being fired when app is backgrounded (fixes #297)
* Change all plugin IDs to lower case
* Fix #296, prepare was running plugin add each time
* iOS: Removed dependency on CoreLocation framework


### v0.3.1 (August 21, 2014)
* Most plugins are now downloaded from Cordova plugin registry
* Update Crosswalk to M37
* Update com.google.payments to ensure compatibility with bare cordova apps
* Create faq.md
* cordova-android: Add Gradle support


### v0.3.0 (August 1, 2014)
* Lots of new plugins courtesy of [Francois Beaufort](https://plus.google.com/+FrancoisBeaufort)!
  * `chrome.audioCapture` and `chrome.videoCapture` to add android permissions to allow WebRTC within the [new crosswalk webview](#v011-june-25-2014)
  * Added support for `chrome.system.cpu` on Android
  * Added support for `chrome.system.display` on Android
  * Added support for `chrome.system.memory` on Android
  * Added support for `chrome.system.network` on Android
* Updated `google.payments` plugin
  * fix `google.payments.inapp.getSkuDetails` API signature
  * add `google.payments.inapp.getPurchases` method
  * remove `google.payments.inapp.getAvailableProducts` method
  * Update install instructions
* Updated `chrome.power.requestKeepAwake` to support `'system'` in addition to `'display'`
* Removed several build warnings for iOS
* Updated documentation

### v0.2.2 (July 22, 2014)
* Minor fix: Don't temporarily set widget id to undefined when importing chrome apps with no manifest.mobile.json


### v0.2.1 (July 18, 2014)
* This update is released as 0.2.1 in light of the fact the 0.1.1 should have been 0.2.0
* *Important*: Android applications run by default in the Crosswalk webview (see 1.1 release notes)
* Updated cordova-android, cordova-crosswalk-engine, google-play-services
* Correct URL manipulation methods for data urls
* escape strings in config.xml to allow for special characters like email addresses
* Add .jshintrc file and fix all JSHint errors
* Adding FileChooser dependency to chrome.filesystem
* better error messages
* iOS: Close open sockets on app reset/shutdown
* Fixed an Null pointer Exception when getting an app id
* Updated documentation


### v0.1.1 (June 25, 2014)
* This is an exciting and significant milestone release!
* *Important*: Android applications now run inside a new packaged chromium-based webview, using the [Crosswalk Project](https://crosswalk-project.org/)!
  * This webview is currently based on Chrome/36, and supports WebGL, Accelerated Canvas, WebRTC, WebAudio, runs polymer without polyfills, and more!
  * Few caveats:
    * size of apk has increased by ~35Mb (expect that to decrease to ~18Mb very soon)
    * You must use Chrome 36+ on desktop to use remote debugging via web inspector
  * You can opt-out of this webview by setting `"webview”: "system"` in `manifest.mobile.json`
* *Important*: New `cca push [--watch]` command to work with the [Chrome App Developer Tool for Mobile](https://github.com/MobileChromeApps/chrome-app-developer-tool)
    * This is an awesome new workflow for rapid application development, we suggest you try it out!
* New: `cca upgrade` command, will re-add latest platforms and plugins
  * Additionally, cca will prompt for upgrade whenever it detects a new cca version is installed (use `cca --skip-upgrade` to ignore this)
  * No longer necessary to re-create projects every time you `npm update -g cca`!
  * Note: upgrade will delete `platforms/` and `plugins/` so make sure you don’t have local edits
* cca will now remove chrome plugins when you remove api permissions from your manifest
* Added `geolocation` permission support
* `chrome.socket` bugfixes and better cleanup of lingering connections.
* Lots of updated documentation


### v0.1.0 (May 28, 2014)
* Quick release since 0.0.11 is no longer installing fine due to changes to cordova npm modules and plugin registry.
* First MINOR version number bump, but long overdue. A lot has changed since our first release.
* cca: Updating cordova to 3.5 release
* cca: Updating cca to work with cordova-cli & cordova-lib split
* cca: Create a default .gitignore file for new projects
* cca: Install default plugins on prepare
* chrome.socket: ios: Fix socket.read() not respecting maxLength
* chrome.socket: ios: Make chrome.socket.destroy call disconnect
* google-play-services: Update google-play-services to v16

### v0.0.11 (May 08, 2014)
* Re-publishing 0.0.10 exectly as is to work around npm publish error.

### v0.0.10 (May 08, 2014)
* Lots of updated documentation
* Move cordova-android and cordova-ios submodules to 3.5.0-rc1 and 3.4.1 tags, respectively
* Move cordova npm dependancy to 3.4.1-0.1.0
* cca: Fix #126 cca create with absolute paths
* cca: Ignore fullscreen and background permissions in manifest.json
* cca: Fix #151 <access> tags never being removed on prepare
* chrome.gcm: Initial Release!
* chrome.gcm: Fix #150 Handle gcm messages when app not active
* chrome.identity: Added account to iOS authentication.
* chrome.identity: Fixed Android web authentication.
* chrome.power: requestKeepAwake and releaseKeepAwake must run on the UI thread

### v0.0.9 (April 1, 2014)
* Lots of updated documentation
* chrome.fileSystem: Updated error handling
* chrome.identity: Added an account hint
* chrome.identity: Added the account to the getAuthToken callback
* chrome.notifications: Expand basic notification when message text overflows
* chrome.socket: Moved connection to its own thread
* chrome.socket: Fix up Android's getNetworkList() to match desktop
* chrome.syncFileSystem: Added a reset method to clear the internal cache
* chrome.syncFileSystem: Improved error handling
* chrome-bootstrap: Fix angular apps having the extensionID in their hash on start-up on KitKat
* chrome-bootstrap: Fix chrome-extension: URLs not setting no-cache headers
* cca: Added a run platform target of 'chrome'
* cca: Fix handling of path components in host permissions

### v0.0.8 (Mar 11, 2014)
* Fixed googleplayservices plugin (previous update crashes apps)

### v0.0.7 (Mar 10, 2014)
* Faster `cca create` and `cca prepare`
* Improved log messages & no longer hiding output from hooks & build sub-commands
* Show output from hooks and build sub-commands
* Move cordova-android and cordova-ios submodules to 3.4.0 tags
* Detect and show an error when trying to create from a parent directory
* Android: Removing addJavascriptInterface bridge for pre-4.2 due to security vulnerability
* Fire document readystatechange events on Android (fixes Polymer on KitKat)
* Fix document.location properties on window.create (#77 - fixes jQuery Mobile history)
* iOS: Don't detect hash changes as page reloads (#76)
* New command `cca push` for pushing to Chrome ADT
* Adding merging of platform specific manifest settings (see docs)
* cordova-plugin-file: Updated to v1.0.1 (refer to its RELEASE_NOTES.md)
* chrome.socket: A few bugfixes (refer to Release Notes within its README.md)
* chrome.identity: Added a Google Play Services availability check
* chrome.identity: Added getRedirectURL()
* chrome.identity: Remove a manual step for iOS (Adding URL type to Info.plist)
* chrome.identity: Fixed security hole in InAppBrowser plugin on iOS (used by launchWebAuthFlow)

### 0.0.6 (skipped)

### 0.0.5 (Feb 5, 2014)
* Fire readystate change events to fix polymer on Android KitKat
* Fix for locally installed `cca` not setting up hooks correctly.
* Fix npm install not working when `git` isn't installed.
* Fixes #80: Don't enable android if `ant` is not found.

### 0.0.4 (Feb 4, 2014)
* Fixes #54: delayedStream npm dependency not found
* Fixes #56: cca checkenv not checking for javac
* Fixes #76, #77: jQuery Mobile page transitions not working
* Adds LICENCE, CONTRIBUTORS and AUTHORS pages
* Several documentation fixes
* Fixes iOS open-in-chrome navigation bugs
* Adds missing android-support plugin (fixes chrome.notification on ICS devices)
* Chrome.storage.sync files are now isolated from other filesystems
* Support scripts with type application/javascript
* Updated Cordova Android and iOS submodules
* Updated plugins: InAppBrowser, File, NetworkInformation

### 0.0.3

### 0.0.2

### 0.0.1
* Initial npm release.

