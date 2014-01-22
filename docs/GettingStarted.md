# Getting Started

Please make sure you have completed the [Installation Guide](Installation.md) first.

### Step 1: Create a Project

    cca create com.companyname.YourApp [--link-to=<path>|--copy-from=<path>]

* You may pass one of `--link-to` or `--copy-from` to build your existing chrome app for mobile.
* The `--link-to` flag will share your existing chrome app code using a _symlink_.
* The `--copy-from` flag will import your existing chrome app code by _copying_ the directory.

### Step 2: Building and Running your application

You can build and run your application either:
* Option A: from the command line, using the `cca` tool, or
* Option B: by using an IDE, like `Eclipse` or `Xcode`.

Both options are described below.

Note that you must use the command line `cca` tool with either option (specifics are described in Step 3, below).  The use of an IDE is entirely optional (but often useful) to assist with launching, configuring, and debugging your hybrid mobile application.

### Step 2, Option A: Using the command line

* To run on the iOS Simulator: `cca emulate ios`
* To run on a connected iOS device: `cca run ios`
  * This requires that you've set up a [Provisioning Profile](http://stackoverflow.com/questions/3362652/what-is-a-provisioning-profile-used-for-when-developing-iphone-applications) for your device.
* To run on the Android Emulator: `cca emulate android`
  * This requires that you've set up an emulator `avd`. You can run `android avd` to set this up.
  * Download additional Emulator images by running `android`.
  * To make the intel images run faster, install [Intel's HAXM](http://software.intel.com/en-us/articles/intel-hardware-accelerated-execution-manager/).
* To run on a connected Android device: `cca run android`


### Step 2, Option B: Using an IDE

#### iOS

In Xcode, open the `xcodeproj` file from within the `platforms/ios/` directory.

    open platforms/ios/*.xcodeproj

Make sure you are building the right target.
  * In the top left (beside Run&Stop buttons) there is a dropdown to select target project and device.  Ensure that `YourApp` is selected and _not_ `CordovaLib`.

#### Android

* In Eclipse, select `File` -> `Import`
* Choose `Android` > `Existing Android Code Into Workspace`.
* Import from the path you just created with `cca`.
    * You should expect to have two projects to import, one of which is `*-CordovaLib`
* You will need to create a Run Configuration (as with all Java applications).  You _usually_ get prompted for this the first time automatically.
* You will need to manage your devices/emulators the first time as well.

### Step 3: Making changes to your App

Your HTML, CSS and JS files live within the `www` directory.

_Every time_ you change them, you _must_ run `cca prepare` from the root of your project.  Otherwise, those changes will not be reflected when running your app.

## Experiencing Hiccups?

Please [reach out to us](mailto:mobile-chrome-apps@googlegroups.com).

## Done?

Check out some [next steps](NextSteps.md), or read the [API Status document](APIStatus.md).
