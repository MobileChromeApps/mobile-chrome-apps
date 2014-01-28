# Run Chrome Apps on mobile using Apache Cordova
_**The toolchain for running Chrome Apps on mobile is in early developer preview. Feel free to give us your feedback using the [Github issue tracker](https://github.com/MobileChromeApps/mobile-chrome-apps/issues), our [Chrome Apps developer forum](http://groups.google.com/a/chromium.org/group/chromium-apps/topics), on [Stack Overflow](http://stackoverflow.com/questions/tagged/google-chrome-app), or our [G+ Developers page](https://plus.google.com/+GoogleChromeDevelopers/).**_

## Overview

You can run your [Chrome Apps](http://developer.chrome.com/apps) on Android and iOS via a [toolchain](//github.com/MobileChromeApps/mobile-chrome-apps) based on [Apache Cordova](http://cordova.apache.org), an open source mobile development framework for building mobile apps with native capabilities using HTML, CSS and JavaScript.

Apache Cordova wraps your application's web code with a native application shell and allows you to distribute your hybrid web app via Google Play and/or the Apple App Store. To use Apache Cordova with an existing Chrome App, you use the `cca` (**c**ordova **c**hrome **a**pp) command-line tool.

Try out the `cca` toolchain by following these steps:

* [Step 1: Install your development tools](docs/Installation.md)

* [Step 2: Create a project](docs/GettingStarted.md#step-2-create-a-project)

* [Step 3: Develop](docs/GettingStarted.md#step-3-develop)

* [Step 4: Publish](docs/Publish.md)

Once you have a converted app, add some polish with an [app icon](docs/NextSteps.md#icons) and a [splash screen](docs/NextSteps.md#splash-screens).

There are a few special considerations that you should keep in mind when developing with Cordova; we've listed them in the [considerations section](docs/CordovaConsiderations.md).

To view which Chrome APIs are supported on mobile, visit the [API Status](docs/APIStatus.md) page.

And if you're in a hurry, use the [Chrome ADT](docs/ChromeADT.md) to preview your Chrome App on an Android device without the toolchain.

_**Let's get started. Continue to [Step 1: Install your development tools &raquo;](docs/Installation.md)**_