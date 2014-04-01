# Integration layer for Chrome Apps in Cordova

This plugin contains the code used to wrap a Chrome app and make it run using
Cordova. It is meant to be used with the `cca` tool, and isn't useful outside
the context of a mobile Chrome App.

# Release Notes
## 1.0.2 (April 1, 2014)
- Fix chrome-extension: URLs not setting no-cache headers.
- Fix AngularJS apps having the extension ID in their hash on start-up on KitKat.

## 1.0.1 (March 10, 2014)
- Support scripts with type application/javascript
- Fixes #76 - Don't detect hash changes as page reloads.
- Fix document.location properties on window.create (Fixes MobileChromeApps/mobile-chrome-apps#77)
- Fire document readystatechange events on Android (fixes Polymer on KitKat)
- Use a NSURLConnection in ChromeExtensionURLs so that loads can chain with App Harness' URLRemap.
- Set Content-Type on chrome-extension: URLs. Fixes #95 (svg rendering)
- Support scripts with type application/javascript

