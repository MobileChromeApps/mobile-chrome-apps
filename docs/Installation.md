## Step 1: Install your development tools

The Chrome Apps for Mobile toolchain can target iOS 6+ and Android 4.x+.

### Development dependencies for all platforms

* [Node.js](http://nodejs.org) (we test with versions `0.10.0` and `0.12.0`):
  * **Windows**: Install Node.js using the installation executables that you can download from [nodejs.org](http://nodejs.org).
  * **OS X** or **Linux**: Installation executables are also available from [nodejs.org](http://nodejs.org). If you wish to avoid the need for root access, it may be more convenient to install via [nvm](https://github.com/creationix/nvm). For example:

            curl -L https://raw.githubusercontent.com/creationix/nvm/master/install.sh | sh
            source ~/.bash_profile || source ~/.profile || source ~/.bashrc
            nvm install 0.12
            nvm alias default 0.12

### Targeting Android

When developing an application for Android, you will also need to install:

* [Java JDK](http://www.oracle.com/technetwork/java/javase/downloads/index.html) 6 (or higher)
* [Android SDK](https://developer.android.com/sdk/index.html)
  * We recommend using the "_Get the SDK for an existing IDE_" or "_Android Studio_" methods.
  * **Linux**: The Android SDK requires 32 bit support libraries. On Ubuntu, get these via: `apt-get install ia32-libs`.
* **Note:** On Windows, you need [vendor-specific device drivers](http://developer.android.com/tools/extras/oem-usb.html) to connect to certain devices.


### Targeting iOS

Please note that iOS development can only be done on OS X. In addition, you will need to install:

* [Xcode](https://developer.apple.com/xcode/) 5 (or higher) which includes the Xcode command line tools
* [ios-deploy](https://github.com/phonegap/ios-deploy) (needed to deploy to an iOS device)
  * `npm install -g ios-deploy`
  * If you get a "make: command not found" error, then run this first:
    * `export PATH="$PATH:$(xcode-select --print-path)/usr/bin"`
* [ios-sim](https://github.com/phonegap/ios-sim) (needed to deploy to iOS Simulator)
  * `npm install -g ios-sim`
* *Optional:* Register as an iOS developer
  * This is necessary for testing on real devices and for submitting to the app store.
  * You can skip registration if you only plan to use the iPhone/iPad simulators.

### Install the `cca` command-line tool

Install `cca` via npm:

    npm install -g cca

To update the toolchain later with new releases, use the same command: `npm install -g cca`.

Confirm that everything is installed correctly by running this command from the command line:

    cca checkenv

The output should contain the version number of `cca` and information about your Android or iOS SDK installation.

_**Done? Continue to [Step 2: Create a project &raquo;](CreateProject.md)**_
