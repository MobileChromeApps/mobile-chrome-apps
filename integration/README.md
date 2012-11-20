# Integration layer for Chrome Apps in Cordova

This directory contains the files used to wrap a Chrome app and make it run using Cordova.
Notes about the integration:

Files to use as templates (copy them and then change them):
* `background.js`: To be replaced with your app's background page. Remember to change its name in `manifest.json`. Have the background page `window.create` your own `index.html`, not `chromeapp.html`.
* `manifest.json`: Can be replaced with your app's manifest. Nothing special about Cordova here. Point it at the background page.

Files that should not be edited:
* `chromeapp.html`: **When you create your Cordova project, point it at this file, not `index.html`!**
* `chromebgpage.html`: More or less empty.
* `chromeappstyles.css`: Default CSS for Chrome Apps.

## How to create an iOS Chrome App project ###
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
