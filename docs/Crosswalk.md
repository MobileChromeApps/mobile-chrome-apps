# Using Crosswalk on Android in Chrome Apps for Mobile

Running on Android, Chrome Apps for Mobile can leverage the powerful functionality and performance of the latest Chromium WebView.  This is possible due to the [Crosswalk](http://crosswalk-project.org/) open source project, which provides an embeddable Chromium WebView.

## Overview
One of the main challenges of developing hybrid mobile applications on Android was the lack of a modern and performant WebView.  Hybrid mobile applications were limited by the WebView provided by the Android device on which it ran.  For the developer, this typically meant a trade-off between broader device support and advanced functionality.

With the inclusion of Crosswalk, Chrome Apps for Mobile will use an embedded Chromium WebView, which replaces the system WebView provided by the Android device.  This means that the application's web code will run in the same Chromium WebView on many different devices.

By default, mobile Chrome Apps use Crosswalk.  However, you can choose to opt out of using Crosswalk and use the system WebView by:
  - Adding `"webview": "system"` to `manifest.mobile.json` (found in the `www` directory).
  - Running with `cca run android --webview=system` or when building: `cca build android --webview=system`

## Benefits
- Capabilities: such as WebRTC, WebAudio, and Accelerated 2D Canvas
- Performance improvements
- Consistent user experience and reduced testing effort across Android devices

## Drawbacks
- Increased memory footprint
  - An overhead of ~30MB (as _reported by the RSS column of_ `ps`)
  - Unlike the system WebVew, Crosswalk resources are not shareable between applications
- Increased APK size (about 17MB)
- Increased size on disk when installed (about 50MB)
- Crosswalk Webview does not auto-update
  - You have to manually upgrade and re-publish your app to take advantage of any Crosswalk performance improvements
