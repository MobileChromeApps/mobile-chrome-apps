# Chrome Packaged Apps for Mobile

This repo contains tools for creating [Chrome Packaged Apps](http://developer.chrome.com/apps) that
run as native Android and iOS applications through [Apache Cordova](http://cordova.apache.org/).

## Step 0: Install iOS and/or Android SDKs

Set yourself up for mobile app development:

* [iOS](http://docs.phonegap.com/en/edge/guide_getting-started_ios_index.md.html#Getting%20Started%20with%20iOS)
* [Android](http://docs.phonegap.com/en/edge/guide_getting-started_android_index.md.html#Getting%20Started%20with%20Android)


## Step 1: Clone this Repository

There is a script that will do this for you:

* Download & run the [mca-create.js](https://raw.github.com/MobileChromeApps/mobile-chrome-apps/master/mca-create.js) script.


## Step 2: Create a Project

Now that you've cloned the repository, use the command line to generate a project:

    node mca-create.js com.company.MyAppName


## Step 3: Running the Project

The easiest way to run the project is through an IDE.

* For iOS: The project file is located at `MyAppName/platforms/ios/MyAppName.xcodeproj`
* For Android: Use the `Import` -> `Existing Android Code into Workspace`


## Step 4: Making Changes

Your HTML & JS files live within the `app/www` directory. Every time you change them,
you must run the `mca-update` script located in the root of your project.
