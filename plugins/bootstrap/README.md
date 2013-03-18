# Integration layer for Chrome Apps in Cordova

This plugin contains the code used to wrap a Chrome app and make it run using Cordova.

## Installation

    cordova plugin add /path/to/this/directory
    $EDITOR www/config.xml   # Change the <content> tag to point at chromeapp.html

## Background

See the example `background.js` and `manifest.json` files in `../../templates`. If your project already has a `background.js` and `manifest.json`, they should be usable without modification.

This plugin adds the following files to the Cordova `www/` directory. They should not be edited.
* `chromeapp.html`: **When you create your Cordova project, point it at this file, not `index.html`!**
* `chromebgpage.html`: More or less empty.
* `chromeappstyles.css`: Default CSS for Chrome Apps.

## iOS Extra Steps
Run these commands:

    incubator-cordova-ios/bin/create --shared dirName com.google.name ProjectID
    cd dirName
    rm -r www
    open ProjectID.xcodeproj

Delete the reference to www within Xcode (blue icon within the Navigator).

Change Classes/AppDelegate.m:

    self.viewController.useSplashScreen = NO;
    self.viewController.startPage = @"chromeapp.html";

Change the Build Phases:

1. Click on the top project entry on the left-nav
1. Click the application target
1. Click the "Build Phases" tab
1. Change the "touch www" phase to:
        exec ${PROJECT_DIR}/../../chrome-cordova/integration/iosbuildstep.sh "path/to/chrome-app" "path/to/cordova.js"

Example values for the path to cordova.js argument:
* ../../incubator-cordova-ios/CordovaLib
* ../../incubator-cordova-js/pkg
* some/path/to/cordova.ios.js

If you have a cordova.js file within your path/to/chrome-app, then you can leave off the second argument.

## How to create an Android Chrome App project ###
TODO.
