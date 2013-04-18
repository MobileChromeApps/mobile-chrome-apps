# Chrome Apps for Mobile

APIs, integration shim, and tests for running Chrome Packaged Apps V2 on mobile (iOS and Android), using Apache Cordova.

(These tools are at a very early alpha stage.)

## Components

* APIs live under `plugins/`.
    * Some APIs (socket, storage, etc.) have standalone plugins and are optional. They can be used with just `plugins/common`, `plugins/bootstrap` is not necessary if the app is not a Chrome app.
    * `plugins/common` contains generic things like `chrome.Event` that are used everywhere.
    * `plugins/bootstrap` contains the main Chrome `runtime` and `window` APIs, and the HTML wrapper `chromeapp.html` used to bootstrap a Chrome app on Cordova.
* Chrome-spec test suite is in `spec/`.
* Example Chrome app files like `manifest.json` are in `templates/`.

## Step 0: Prerequisites

You will only need to run these steps once.  These instructions are prepared for OSX only.

First, set yourself up for mobile app development:

* [iOS](http://docs.phonegap.com/en/edge/guide_getting-started_ios_index.md.html#Getting%20Started%20with%20iOS)
* [Android](http://docs.phonegap.com/en/edge/guide_getting-started_android_index.md.html#Getting%20Started%20with%20Android)

Now, to set up your local development you will need to:

1. Clone the relevant cordova git repositories, as well as this one
2. Build cordova-js
3. Install the latest `cordova` command line tool
4. Symlink some files around

Use the following script to guide you:

    # create the right directory structure
    mkdir cordova
    mkdir mobile_chrome_apps
    
    # clone cordova projects
    cd cordova
    git clone https://git-wip-us.apache.org/repos/asf/cordova-ios.git
    git clone https://git-wip-us.apache.org/repos/asf/cordova-android.git
    git clone https://git-wip-us.apache.org/repos/asf/cordova-js.git
    git clone https://git-wip-us.apache.org/repos/asf/cordova-plugman.git
    git clone https://git-wip-us.apache.org/repos/asf/cordova-cli.git
    cd ..
    
    # clone cordova projects
    cd mobile_chrome_apps
    git clone https://github.com/MobileChromeApps/chrome-cordova.git
    cd ..
    
    # build cordova-js
    cd cordova/cordova-js
    jake
    cd ../..
    
    # install cordova-plugman
    cd cordova/cordova-plugman
    git checkout future
    npm install
    sudo npm link
    cd ../..
    
    # install cordova-cli
    cd cordova/cordova-cli
    git checkout future
    npm install
    sudo npm link
    npm link plugman
    cd ../..
    
    # link files
    cd cordova/cordova-cli
    rm -rf lib/cordova-*
    ln -s $PWD/../cordova-ios lib/
    ln -s $PWD/../cordova-android lib/
    rm lib/cordova-ios/CordovaLib/cordova.ios.js
    ln -s $PWD/../cordova-js/pkg/cordova.ios.js lib/cordova-ios/CordovaLib/
    rm lib/cordova-android/framework/assets/js/cordova.android.js
    ln -s $PWD/../cordova-js/pkg/cordova.android.js lib/cordova-android/framework/assets/js/
    cd ../..
    
    # rejoice
    echo 'Huzzah!'

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

For iOS, you can open the project in xcode using:

    open platforms/ios/*.xcodeproj/

For Android, you will need to create a new Android project, using the import existing project option.  TODO: add more details.

For Either, you can use the cordova command line tools:

    cordova prepare # sadly, required after each modification to your app
    cordova build ios
    cordova build android
    cordova emulate ios
    cordova emulate android