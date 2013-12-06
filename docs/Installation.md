# Installing the Mobile Chrome Apps tools


## Install Dependencies

iOS and Android are both optional, but you need at least one of them.

### iOS

Note: iOS development can only be done on OSX.
* Install [XCode 4](https://developer.apple.com/xcode/), with the iOS SDK.
* Install xcode command line tools.
* You must register as an iOS developer for testing on real devices and for submitting to the app store.  You can skip this if you only plan to use the iPhone/iPad simulators.

### Android

* Install the [Android SDK and Developer Tools](http://developer.android.com/sdk/index.html), which comes bundled with Eclipse.
* Ensure that the folder with `android` and `adb` commands are added to your `PATH`.
 * Note, you may have to run the `android` command and install platform-tools before you can add `adb` to your `PATH`.
* Run the `android` tool, and use it to install the Android 4.2.2 SDK, and the Google Play Services APIs.

### node.js

* Install a _recent_ version of [node.js](http://nodejs.org) (0.10+).

## Clone This Repository

* Clone this repository.  Then run `./mca init` to have it auto-install its dependencies.

        git clone git://github.com/MobileChromeApps/mobile-chrome-apps.git
        cd mobile-chrome-apps
        ./mca init
        # Optionally, to add global mca command into PATH:
        npm link

* On Windows, remove the "./" prefix from the last line.
* The `npm link` step is optional, but will add `mca` command to a global PATH if you have npm (node package manager) set up correctly.

## Experiencing Hiccups?

Please reach out to us at [mobile-chrome-apps@googlegroups.com](mailto:mobile-chrome-apps@googlegroups.com).

## Completed Successfully?

Now read the [Getting Started guide](GettingStarted.md).
