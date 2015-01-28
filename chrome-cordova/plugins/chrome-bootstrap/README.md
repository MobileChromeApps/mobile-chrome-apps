# Integration layer for Chrome Apps in Cordova

This plugin contains the code used to wrap a Chrome app and make it run using
Cordova. It is meant to be used with the `cca` tool, and isn't useful outside
the context of a mobile Chrome App.

## Status

The support for various functionality, across platforms, is summarized in the table below.

| API | Android | iOS  |
| -------------- |:-------:|:----:|
| AppWindow: hide, minimize, restore, show | Yes     | No-op<sup>1</sup> |
| AppWindow: all other methods      | No      | No   |
**Notes:**

1. The [iOS Human Interaction Guidelines](https://developer.apple.com/library/ios/documentation/userexperience/conceptual/mobilehig/StartingStopping.html)
    do not allow apps to show/hide/close programmatically.
    Thus, these methods are implemented as a no-op
    (will execute without error on iOS, but have no behavior)

## Reference

The API references are:
- chrome.app.window: [here](https://developer.chrome.com/apps/app_window)

# Release Notes

## 1.1.3 (Jan 28, 2015)
* Undo: Move setting of gradle properties from js to chrome-bootstrap gradle, since it broke older cca versions

## 1.1.2 (Jan 27, 2015)
* Move setting of gradle properties from js to chrome-bootstrap gradle
* Ignore <!-- html --> when parsing main page (fixes #510)
* Make all Event.fire()s equate to queueStartUpEvent calls.
* Don't execute inline scripts before non-inline ones that proceed them (fixes #482)

## 1.1.1 (Nov 26, 2014)
* Fix HTMLImports not working with imports polyfill (#450)

## 1.1.0 (November 17, 2014)
* chrome.alarms: Make it more robust and prevent onLaunched when onAlarm is the cause of the Activity starting up
* Have window.create() call window.show().
* Implement AppWindow methods: show(), hide(), minimize(), restore() (resolves #323)

## 1.0.5 (October 24, 2014)
* Stop disabling inline `<script>` (fixes #384)
* Fix rewritePage when `<!-- <body> -->` exists (fixes #364)
* chrome-bootstrap: Throw an uncaught exception when background page is unloaded

## 1.0.4 (October 21, 2014)
* Documentation updates.

## 1.0.3 (September 24, 2014)
* Defer HTML imports using placeholder tag (fixes non-vulcanized Polymer apps)

## 1.0.2 (April 1, 2014)
* Fix chrome-extension: URLs not setting no-cache headers.
* Fix AngularJS apps having the extension ID in their hash on start-up on KitKat.

## 1.0.1 (March 10, 2014)
* Support scripts with type application/javascript
* Fixes #76 - Don't detect hash changes as page reloads.
* Fix document.location properties on window.create (Fixes MobileChromeApps/mobile-chrome-apps#77)
* Fire document readystatechange events on Android (fixes Polymer on KitKat)
* Use a NSURLConnection in ChromeExtensionURLs so that loads can chain with App Harness' URLRemap.
* Set Content-Type on chrome-extension: URLs. Fixes #95 (svg rendering)
* Support scripts with type application/javascript

