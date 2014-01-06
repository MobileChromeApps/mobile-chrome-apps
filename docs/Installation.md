# Installing the Mobile Chrome Apps tools


## Install Dependencies

iOS and Android are both optional, but you need at least one of them.

### iOS

Note: iOS development can only be done on OS X.
* Install [Xcode 5](https://developer.apple.com/xcode/).
* You must register as an iOS developer for testing on real devices and for submitting to the app store.  You can skip this if you only plan to use the iPhone/iPad simulators.

### Android

* Install Java JDK: [http://www.oracle.com/technetwork/java/javase/downloads/index.html](http://www.oracle.com/technetwork/java/javase/downloads/index.html)
* Install the [Android SDK and Developer Tools](http://developer.android.com/sdk/index.html), which comes bundled with Eclipse.
  * Add `sdk/tools` and `sdk/platform-tools` to your PATH environment variable.

### node.js

* Install a _recent_ version of [node.js](http://nodejs.org) (0.10+).

For Mac / Linux:
* Using `nvm` to install node has advantages
    curl https://raw.github.com/creationix/nvm/master/install.sh | sh
    source ~/.bash_profile
    nvm install 0.10
    nvm alias default 0.10

## Clone This Repository

* Clone this repository.  Then run `./mca init` to have it auto-install its dependencies.

        git clone git://github.com/MobileChromeApps/mobile-chrome-apps.git
        cd mobile-chrome-apps
        ./mca init
        # Optionally, to add global mca command into PATH:
        npm link

* On Windows, remove the "./" prefix from the last line.
* The `npm link` step is optional, but will add `mca` command to a global PATH if you have npm (node package manager) set up correctly.

## Experiencing Hiccups?

Please reach out to us at [mobile-chrome-apps@googlegroups.com](mailto:mobile-chrome-apps@googlegroups.com).

## Completed Successfully?

Now read the [Getting Started guide](GettingStarted.md).
