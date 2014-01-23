# Installation Guide

## Step 1: Dependencies

### Node.js (comes with npm)

Version 0.10.0+ is required.

#### Windows:
* Available from [nodejs.org](http://nodejs.org).

#### OS X & Linux:
* Available from [nodejs.org](http://nodejs.org).
* To avoid the need for root access, it may be more convenient to install via [nvm](https://github.com/creationix/nvm).


    curl https://raw.github.com/creationix/nvm/master/install.sh | sh
    source ~/.bash_profile
    nvm install 0.10
    nvm alias default 0.10

### iOS SDK

iOS development can only be done on OS X.

* Install [Xcode 5](https://developer.apple.com/xcode/).
* Install [ios-deploy](https://github.com/phonegap/ios-deploy) (needed to deploy to an iOS device).
  * Quick instructions: `npm install -g ios-deploy`
* Install [ios-sim](https://github.com/phonegap/ios-sim) (needed to deploy to iOS Simulator).
  * Quick instructions: `npm install -g ios-sim`
* Optional: Register as an iOS developer
  * This is necessary for testing on real devices and for submitting to the app store.
  * You can skip this if you only plan to use the iPhone/iPad simulators.

### Android SDK

* Install Java JDK 7: [http://www.oracle.com/technetwork/java/javase/downloads/index.html](http://www.oracle.com/technetwork/java/javase/downloads/index.html)
* Install the [Android SDK and Developer Tools](http://developer.android.com/sdk/index.html).
  * Add `sdk/tools` and `sdk/platform-tools` [to your PATH](https://www.google.com/search?q=how+to+add+sdktools+to+path) environment variable.
  * _OS X Only_ - The version of Eclipse that comes with the Android SDK requires JRE 6. If opening Eclipse.app does not prompt you to install JRE 6, get it through the Mac App Store.
* Install [Apache Ant](http://ant.apache.org/bindownload.cgi)
  * Add `apache-ant-x.x.x/bin` [to your PATH](https://www.google.com/search?q=how+to+add+sdktools+to+path) environment variable.

## Step 2: Install cca

* Install via npm:
  * Quick instructions: `npm install -g cca`
* To update it later on:
  * Quick instructions: `npm update -g cca`

## Step 3: Confirm everything is installed correctly

Run this command from the command line:

    cca checkenv

### Experiencing Hiccups?

Please reach out to us at [mobile-chrome-apps@googlegroups.com](mailto:mobile-chrome-apps@googlegroups.com).

### Done?

Read the [Getting Started guide](GettingStarted.md).
