# Create Chrome Apps for Mobile Using Apache Cordova
_**The Chrome Apps for Mobile toolchain is in developer preview. We welcome your feedback on the [Github issue tracker](https://github.com/MobileChromeApps/mobile-chrome-apps/issues), the [Chrome Apps developer forum](http://groups.google.com/a/chromium.org/group/chromium-apps/topics), [Stack Overflow](http://stackoverflow.com/questions/tagged/google-chrome-app), and our [G+ Developers page](https://plus.google.com/+GoogleChromeDevelopers/).**_

![A Chrome App running on both desktop and mobile](docs/images/todomvc-chromebook.png)

## Overview

Chrome Apps for Mobile is a project based on Apache Cordova to run your [Chrome Apps](https://developer.chrome.com/apps/about_apps) on both Android and iOS. The project provides a native application wrapper around your Chrome App, allowing you to distribute it via the Google Play Store and the Apple App Store. Cordova plugins give your App access to a wide range of APIs, including many of the core Chrome APIs. The newest version of Chrome Apps for Mobile includes Chrome APIs for [identity](https://developer.chrome.com/apps/identity), Google Cloud Messaging ([GCM](https://developer.chrome.com/apps/gcm)) and [rich notifications](https://developer.chrome.com/apps/notifications).

For an overview and demo of hybrid development, Chrome Apps for Mobile, and our Chrome App Developer Tool for Mobile, check out our Google I/O Bytes video.

[![Chrome Apps on Android and iOS](docs/images/io-byte-screenshot.png)](http://www.youtube.com/watch?v=nU4lvgTrjFI)

## Tools

### [Chrome App Developer Tool for Mobile (CADT)](https://github.com/MobileChromeApps/chrome-app-developer-tool/)

CADT is an app for your mobile development device that makes it quick and easy to see your code in action. It provides the Cordova framework of Chrome Apps for Mobile so you can test your code by simply pushing your Chrome App assets to your mobile device (made easy with our tools), which is must faster than packaging up the entire mobile app.

CADT integrates with both Chrome Dev Editor and `cca` to bring you __live deploy__, allowing you to instantly preview the Chrome App you're editing, running right on your Android or iOS device. When you make a change to the code in your editor, you'll see it straight away on your device.

### [The `cca` Command Line Tool](https://github.com/MobileChromeApps/mobile-chrome-apps/blob/master/docs/Installation.md#install-the-cca-command-line-tool)

`cca` provides all the functionality you need to develop and package Chrome Apps for Mobile from the command line. Use it with CADT to rapidly iterate on your code: live deploy allows you to instantly see your Chrome App running on a connected mobile device. When you are ready to publish your Chrome App for Mobile to the Apple App Store and Google Play Store, use `cca` to bundle up your Chrome App into the proper mobile packages.

### [Chrome Dev Editor (CDE)](https://github.com/dart-lang/chromedeveditor)

CDE is an IDE built specifically for Chrome Apps. Use it with CADT for live deploy.

## Try it out

Try out Chrome Apps for Mobile by following these steps:

* [Step 1: Install your development tools](https://github.com/MobileChromeApps/mobile-chrome-apps/blob/master/docs/Installation.md)

* [Step 2: Create a project](https://github.com/MobileChromeApps/mobile-chrome-apps/blob/master/docs/CreateProject.md)

* [Step 3: Develop](https://github.com/MobileChromeApps/mobile-chrome-apps/blob/master/docs/Develop.md)

* [Step 4: Next Steps](https://github.com/MobileChromeApps/mobile-chrome-apps/blob/master/docs/NextSteps.md)

* [Step 5: Publish](https://github.com/MobileChromeApps/mobile-chrome-apps/blob/master/docs/Publish.md)

## Notes and Resources

* The Chrome Apps for Mobile project is built on top of [Apache Cordova](http://cordova.apache.org), the open source mobile development framework for building mobile apps with native capabilities using HTML, CSS and JavaScript. By default, Chrome Apps for Mobile leverage an embeddable Chromium WebView provided by the [Crosswalk](http://crosswalk-project.org/) project by default, which has both [advantages and some tradeoffs](docs/Crosswalk.md).

* There are a few special considerations that you should keep in mind when developing with Cordova. We've listed them in the [considerations section](https://github.com/MobileChromeApps/mobile-chrome-apps/blob/master/docs/CordovaConsiderations.md).

* To view which Chrome APIs are supported on mobile, visit the [API Status page](https://github.com/MobileChromeApps/mobile-chrome-apps/blob/master/docs/APIStatus.md).

## Let's get started

_**Continue to [Step 1: Install your development tools &raquo;](https://github.com/MobileChromeApps/mobile-chrome-apps/blob/master/docs/Installation.md)**_
