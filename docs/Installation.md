Installing the Mobile Chrome Apps tools
=====

## Step 0: Install Dependencies

### iOS and/or Android SDKs

Set yourself up for mobile app development on iOS, Android, or both.

 * For iOS, you will need to have [XCode 4](https://developer.apple.com/xcode/) installed, with the iOS SDK. Like any iOS development, you don't need to be a registered iOS developer to develop and test on the iPhone and iPad simulators, but you do if you want to submit your apps to the app store, or to test on real devices.

 * For Android, download and install the [Android Developer Tools](http://developer.android.com/sdk/index.html). You will need to ensure that the 'android' and 'adb' commands are in your path. Use the `android` tool to download and install the Android 4.2.2 SDK, and the Google Play Services APIs.

### node.js

Install a recent version of [node.js](http://nodejs.org) (Node 0.6.x, which ships with several Linux distributions, is too old for the current tooling)

## Step 1: Clone This Repository

Check out the repository from github, and run the script once to pull in all of its dependencies.

    git clone git://github.com/MobileChromeApps/mobile-chrome-apps.git
    cd mobile-chrome-apps
    ./mca-create.js


Now see the Getting Started guide
