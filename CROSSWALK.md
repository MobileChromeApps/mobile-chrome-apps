# Using Crosswalk in Chrome Apps for Mobile

Running on Android, Chrome Apps for Mobile can leverage the powerful functionality and performance of the latest Chromium WebView. This is possible due to the [Crosswalk](http://crosswalk-project.org/) open source project, which provides an embeddable Chromium WebView.

## Overview
One of the main challenges of hybrid mobile applications on Android was the lack of a modern and performant WebView.  Hybrid mobile applications were limited by the WebView provided by the individual Android device.  For the developer, this typically means a trade-off between broader device support vs. advanced functionality.

With the inclusion of Crosswalk, Chrome Apps for Mobile will use an embedded Chromium WebView to replace the system WebView provided by the Android device.  This means that the application's web code will run in the same Chromium WebView, across many different devices.

By default, all mobile Chrome Apps will use Crosswalk and an embedded Chromium WebView.  However, using Crosswalk is optional, and any app can choose to use the system WebView instead.  To turn opt out of using Crosswalk:
  - Edit the `manifest.mobile.json` file (found in the www/ directory)
  - Add the setting: `"webview": "system"`

## Benefits
There are a number of specific benefits to using Crosswalk, for both users and developers:
- Use advanced WebView features such as WebRTC, WebAudio, and Accelerated 2D Canvas
- Many performance improvements available in the latest version of Chromium
- Supports any device running Android versions back to Ice Cream Sandwich
- Consistent user experience and reduced testing effort, across Android devices

## Caveats
While Crosswalk addresses pain points of hybrid app development, there are some drawbacks to be considered:
- Increased memory footprint across apps, as the embedded WebView is not sharable. Investigation suggests it has a fixed memory overhead of about 30MB (as _reported by the RSS column of_ `ps`)
- Increased download size/disk space utilization, adding about 30 MB to the .apk size
- Embedded WebView is not auto-updatable, so users cannot receive security and other bug fixes.  Instead, the developer must update and re-publish the app
- Supports only x86 and ARM architectures

## Publishing to the Play Store
When publishing apps to the Play Store, it is important to upload multiple apk files, based on architecture (x86 and ARM).  By providing separate files, the download size is reduced for users. Fortunately, the Chrome Apps for Mobile tooling always generates a separate .apk file for each architecture.  It is simply a matter of including all these files during the publishing process.
