# Chrome Apps for Mobile

APIs, integration shim, and tests for running Chrome Packaged Apps V2 on mobile (iOS and Android), using Apache Cordova.

(These tools are at a very early alpha stage.)

## Components

* APIs live under `plugins/`.
* Chrome-spec test suite is in `spec/`.
* Example Chrome Packaged App files are in `templates/`.

## Step 0: iOS and Android Development Prerequisites

(You will only need to run this step once.)

Set yourself up for mobile app development:

* [iOS](http://docs.phonegap.com/en/edge/guide_getting-started_ios_index.md.html#Getting%20Started%20with%20iOS)
* [Android](http://docs.phonegap.com/en/edge/guide_getting-started_android_index.md.html#Getting%20Started%20with%20Android)

## Step 1: Install environment using the `init_mobile_chromeapp_environment.sh` script.

(You will only need to run this steps once.)

    init_mobile_chromeapp_environment.sh

## Step 2: Create projects using the `create_chromeapp.sh` script.

    cd mobile_chrome_apps
    mkdir -p sandbox
    cd sandbox
    ../chrome-cordova/create_chromeapp.sh PROJECT_NAME

Optionally, import your Chrome Packaged App into the `app/www/` directory.

    cd PROJECT_NAME
    rm -rf app/www
    ln -s PATH_TO_CHROME_APP app/www

## Step 3: Prepare project using the `update_mobile_chromeapp.sh` script.

(You will need to run this step whenever you make changes, before building your app.)

    cd PROJECT_NAME
    ../../chrome-cordova/update_mobile_chromeapp.sh

## Step 4: Building and running

For iOS, you can open the project in xcode using:

    open platforms/ios/*.xcodeproj/

For Android, using Eclipse, create an Android project from existing code.

(TODO: Add necessary details)
