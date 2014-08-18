## Step 1: Install your development tools

The Chrome Apps for mobile toolchain can target iOS 6+ and Android 4.x+.

### Development dependencies for all platforms

* [Node.js](http://nodejs.org) version 0.10.0 (or higher) with `npm` is required:
  * **Windows**: Install Node.js using the installation executables downloadable from [nodejs.org](http://nodejs.org).
  * **OS X** or **Linux**: Installation executables are also available from [nodejs.org](http://nodejs.org). If you wish to avoid the need for root access, it may be more convenient to install via [nvm](https://github.com/creationix/nvm). Example:

            curl -L https://raw.githubusercontent.com/creationix/nvm/master/install.sh | sh
            source ~/.bash_profile || source ~/.profile || source ~/.bashrc
            nvm install 0.10
            nvm alias default 0.10

### Targeting Android

When developing an application for Android, you will also need to install:

* [Java JDK](http://www.oracle.com/technetwork/java/javase/downloads/index.html) 7 (or higher)
* [Android SDK](http://developer.android.com/sdk/index.html) version 4.4.2 (or higher)
  * Install the Android SDK and Android Developer Tools which come bundled with Android ADT Bundle.
  * Add `sdk/tools` and `sdk/platform-tools` [to your PATH](https://www.google.com/search?q=how+to+add+sdktools+to+path) environment variable. 
  * **OS X**: The version of Eclipse that comes with the Android SDK requires JRE 6. If opening Eclipse.app does not prompt you to install JRE 6, get it through the Mac App Store.
  * **Linux**: The Android SDK requires 32 bit support libraries. On Ubuntu, get these via: `apt-get install ia32-libs`.
* [Apache Ant](http://ant.apache.org/bindownload.cgi)
  * Add `apache-ant-x.x.x/bin` [to your PATH](https://www.google.com/search?q=how+to+add+sdktools+to+path) environment variable.

### Targeting iOS

Please note that iOS development can only be done on OS X. In addition, you will need to install:

* [Xcode](https://developer.apple.com/xcode/) 5 (or higher) which includes the Xcode command line tools
* [ios-deploy](https://github.com/phonegap/ios-deploy) (needed to deploy to an iOS device)
  * `npm install -g ios-deploy`
* [ios-sim](https://github.com/phonegap/ios-sim) (needed to deploy to iOS Simulator)
  * `npm install -g ios-sim`
* Optional: Register as an iOS developer
  * This is necessary for testing on real devices and for submitting to the app store.
  * You can skip registration if you only plan to use the iPhone/iPad simulators.

### Install the `cca` command-line tool

Install `cca` via npm:

    npm install -g cca

To update the toolchain later with new releases: `npm update -g cca`.

Confirm that everything is installed correctly by running this command from the command line:

    cca checkenv

You will see the version number of `cca` outputted and confirmation about your Android or iOS SDK installation.

_**Done? Continue to [Step 2: Create a project &raquo;](CreateProject.md)**_
