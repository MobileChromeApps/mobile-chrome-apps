# Installation Guide

## Step 1: Dependencies

### Node.js

Version 0.10.0+ is required.

Windows:
* Available from [nodejs.org](http://nodejs.org).

OS X & Linux:
* Available from [nodejs.org](http://nodejs.org).
* To avoid the need for root access, it may be more convenient to install via [nvm](https://github.com/creationix/nvm).
  * Quick instructions:

        curl https://raw.github.com/creationix/nvm/master/install.sh | sh
        source ~/.bash_profile
        nvm install 0.10
        nvm alias default 0.10

### iOS

iOS development can only be done on OS X.

* Install [Xcode 5](https://developer.apple.com/xcode/).
* Install [ios-deploy](https://github.com/phonegap/ios-deploy).
  * Quick instructions: `npm install -g ios-deploy`
* Install [ios-sim](https://github.com/phonegap/ios-sim).
  * Quick instructions: `npm install -g ios-sim`
* Optional: Register as an iOS developer
  * This is necessary for testing on real devices and for submitting to the app store.
  * You can skip this if you only plan to use the iPhone/iPad simulators.

### Android

* Install Java JDK: [http://www.oracle.com/technetwork/java/javase/downloads/index.html](http://www.oracle.com/technetwork/java/javase/downloads/index.html)
* Install the [Android SDK and Developer Tools](http://developer.android.com/sdk/index.html), which comes bundled with Eclipse.
  * Add `sdk/tools` and `sdk/platform-tools` [to your PATH](https://www.google.com/search?q=how+to+add+sdktools+to+path) environment variable.
* Install [Apache Ant](http://ant.apache.org/)
  * Add `apache-ant-x.x.x/bin` [to your PATH](https://www.google.com/search?q=how+to+add+sdktools+to+path) environment variable.

## Step 2: Mobile Chrome Apps Tool

* Install via npm:
  * Quick instructions: `npm install -g mobile-chrome-apps`
* To update it later on:
  * Quick instructions: `npm update -g mobile-chrome-apps`

## Step 3: Confirm everything is installed correctly

Run this command from the command line:

    mca checkenv

### Experiencing Hiccups?

Please reach out to us at [mobile-chrome-apps@googlegroups.com](mailto:mobile-chrome-apps@googlegroups.com).

### Done?

Read the [Getting Started guide](GettingStarted.md).
