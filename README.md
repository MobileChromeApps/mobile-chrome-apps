# Chrome Packaged Apps for Mobile

This repo contains tools for creating [Chrome Packaged Apps](http://developer.chrome.com/apps) that
run as native Android and iOS applications through [Apache Cordova](http://cordova.apache.org/).

## Step 0: Install Dependencies

### iOS and/or Android SDKs

Set yourself up for mobile app development on iOS, Android, or both.

 * For iOS, you will need to have [XCode 4](https://developer.apple.com/xcode/) installed, with the iOS SDK. Like any iOS development, you don't need to be a registered iOS developer to develop and test on the iPhone and iPad simulators, but you do if you want to submit your apps to the app store, or to test on real devices.

 * For Android, download and install the [Android Developer Tools](http://developer.android.com/sdk/index.html). You will need to ensure that the 'android' and 'adb' commands are in your path. Use the `android` tool to download and install the Android 4.2.2 SDK, and the Google Play Services APIs.

### node.js

Install a recent version of [node.js](http://nodejs.org) (Node 0.6.x, which ships with several Linux distributions, is too old for the current tooling)

## Step 1: Clone This Repository

    git clone git://github.com/MobileChromeApps/mobile-chrome-apps.git
    cd mobile-chrome-apps
    ./mca-create.js

## Step 2: Create a Project

    path/to/mca-create.js com.yourcompanyname.YourAppName

Note: `mobile-chrome-apps` directory is a self-updating git repository, so its easier not to create your projects inside that directory

## Step 3: Open the Project

The easiest way to run the project is through an IDE.

* On iOS:
    * Open the project file, which is located at `MyAppName/platforms/ios/MyAppName.xcodeproj`.
* On Android, there are a couple more (straight-forward) steps:
    * First, import the project into Eclipse by selecting `Import` from the Package Explorer context menu.
    * In the resulting dialog, choose `Android` -> `Existing Android Code Into Workspace` and click `Next >`.
    * Click `Browse...`, navigate to `MyAppName/platforms/android`, click `Open`, and then `Finish`.
    * Finally, add the Google Play Services library as outlined [here](http://developer.android.com/google/play-services/setup.html).


## Step 4: Make Changes

Your HTML & JS files live within the `app/www` directory. Every time you change them,
you must run the `mca-update` script located in the root of your project.
