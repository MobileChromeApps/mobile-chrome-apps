# Chrome Apps for Mobile

APIs, integration shim, and tests for running Chrome Packaged Apps V2 on mobile (iOS and Android), using Apache Cordova.

(These tools are at a very early alpha stage.)

## Components

* APIs live under `plugins/`.
* Chrome-spec test suite is in `spec/`.
* Example Chrome app files like `manifest.json` are in `templates/`.

## Step 0: iOS and Android Development Prerequisites

(You will only need to run this step once.)

Set yourself up for mobile app development:

* [iOS](http://docs.phonegap.com/en/edge/guide_getting-started_ios_index.md.html#Getting%20Started%20with%20iOS)
* [Android](http://docs.phonegap.com/en/edge/guide_getting-started_android_index.md.html#Getting%20Started%20with%20Android)

## Step 1: Install Mobile Chrome Apps environment using the `init_mobile_chromeapp_environment.sh` script.

(You will only need to run this steps once.)

Just run the `init_mobile_chromeapp_environment.sh` script from the local directory of your chosing.  It will:

1. Set up the right directory structure
2. Clone the relevant cordova/mobile_chrome_apps repositories
3. Build `cordova-js`
4. Install the latest `cordova` command line tool
5. Massage aka symlink files around for you

## Creating projects using the `create_chromeapp.sh` script.

The bundled `create_chromeapp.sh` script will take care of most of the heavy lifting, but its a short read if you want to poke inside.

    cd mobile_chrome_apps
    mkdir -p sandbox
    cd sandbox
    ../chrome-cordova/create_chromeapp.sh PROJECT_NAME

Then answer the prompts.  Suggested answers are:

    Install all plugins without prompt? [y/n] y
    Symlink all your plugins? [y/n] n
    Also add chrome spec? [y/n] n

Finally, put your chrome app directly inside your newly created `app/www/` directory.

    cd PROJECT_NAME
    rm -rf app/www
    ln -s PATH_TO_CHROME_APP app/www

## Building and running

First step, and the step to do after any modification to your app, is to run:

    cordova prepare

For iOS, you can open the project in xcode using:

    open platforms/ios/*.xcodeproj/

For Android, you will need to create a new Android project, using the import existing project option.  TODO: add more details.

For Either, you can use the cordova command line tools:

    cordova build ios
    cordova build android
    cordova emulate ios
    cordova emulate android

## Plugin Details

* `plugins/common` is needed by most plugins.
  * Contains generic things like `chrome.Event`.
* `plugins/bootstrap` is needed to run mobile chrome apps.
  * Contains the main Chrome `runtime` and `window` APIs, as well as the HTML wrapper `chromeapp.html` used to bootstrap.
* Some APIs (`socket`, `storage`, etc.) are standalone plugins and are optional.
  * They can be used in an ordinary cordova app (they don't depend on `bootstrap`).
