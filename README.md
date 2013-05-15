# Chrome Packaged Apps for Mobile

This repo contains tools for creating [Chrome Packaged Apps](http://developer.chrome.com/apps) that
run as native Android and iOS applications through [Apache Cordova](http://cordova.apache.org/).

## Step 0: Install Dependencies

### iOS and/or Android SDKs

Set yourself up for mobile app development on [iOS](http://docs.phonegap.com/en/edge/guide_getting-started_ios_index.md.html#Getting%20Started%20with%20iOS) or [Android](http://docs.phonegap.com/en/edge/guide_getting-started_android_index.md.html#Getting%20Started%20with%20Android).

 * For iOS, you will need to have XCode 4 installed, with the iOS SDK.

 * For Android, download and install the Android Development Kit. You will need to ensure that the 'android' and 'adb' commands are in your path. Download and install the Android 4.2.2 SDK, and the Google Play Services APIs.

### node.js

Install a recent version of [node.js](http://nodejs.org) (Node 0.6.x, which ships with several Linux distributions, is too old for the current tooling)

## Step 1: Clone This Repository

There is a script that will do this for you!

Download the [mca-create.js](https://raw.github.com/MobileChromeApps/mobile-chrome-apps/master/mca-create.js) script and run it:

    node mca-create.js


## Step 2: Create a Project

Now that you've cloned the repository, navigate to it and use the following command to generate a project:

    node mca-create.js com.company.MyAppName


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
