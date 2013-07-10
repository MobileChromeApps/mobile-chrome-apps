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
* Run the `android` tool, and use it to install the Android 4.2.2 SDK, and the Google Play Services APIs.
* Update Google Play Services with this command:

        android update lib-project --target "android-17" --path path/to/android/sdk/extras/google/google_play_services/libproject/google-play-services_lib

### node.js

* Install a _recent_ version of [node.js](http://nodejs.org) (Node 0.7.11 is the minimum supported version. 0.6.x, which ships with several Linux distributions, is too old)

## Clone This Repository

* Clone this repository.  Then run `mca-create.js` to have it auto-install its dependencies.

        git clone git://github.com/MobileChromeApps/mobile-chrome-apps.git
        mobile-chrome-apps/mca-create.js

## Experiencing Hiccups?

Please [reach out to us](mailto:mobile-chrome-apps@googlegroups.com).

## Completed Successfully?

Now read the [Getting Started guide](GettingStarted.md).
