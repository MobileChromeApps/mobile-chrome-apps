# Getting Started

Please make sure you have completed [Step 1: Install your development tools](Installation.md) first.

## Step 2: Create a project

You can create a new mobile Chrome App project (named `YourApp`) by running the following command:

    cca create YourApp

If you have already built a Chrome App and you are ready to port it to a mobile platform, you can import an existing Chrome App. The `--link-to` flag will create a _symlink_ to your existing Chrome App directory:

    cca create YourApp --link-to=path/to/manifest.json

If you wish to _copy_ your existing Chrome App files to the newly created project folder, use the `--copy-from` flag instead:

    cca create YourApp --copy-from=path/to/manifest.json

## Step 3: Develop

You can build and run your application in two ways:
* Option A: From the command line, using the `cca` tool, or
* Option B: By using an IDE, like Eclipse or Xcode. The use of an IDE is entirely optional (but often useful) to assist with launching, configuring, and debugging your hybrid mobile application.

### Option A: Develop and build using the command line

From the root of your `cca`-generated project folder:

#### Android
* To run your app on the Android Emulator: `cca emulate android`
  * Note: This requires that you've set up an emulator. You can run `android avd` to set this up. Download additional emulator images by running `android`. To make the intel images run faster, install [Intel's HAXM](http://software.intel.com/en-us/articles/intel-hardware-accelerated-execution-manager/).
* To run your app on a connected Android device: `cca run android`

#### iOS
* To run your app on the iOS Simulator: `cca emulate ios`
* To run your app on a connected iOS device: `cca run ios`
  * Note: This requires that you've set up a [Provisioning Profile](http://stackoverflow.com/questions/3362652/what-is-a-provisioning-profile-used-for-when-developing-iphone-applications) for your device.

### Option B: Develop and build using an IDE

#### Android

1. In Eclipse, select `File` -> `Import`.
2. Choose `Android` > `Existing Android Code Into Workspace`.
3. Import from the path you just created with `cca`.
    * You should expect to have two projects to import, one of which is `*-CordovaLib`.
4. Click the Play button to run your app.
  * You will need to create a Run Configuration (as with all Java applications).  You _usually_ get prompted for this the first time automatically.
  * You will need to manage your devices/emulators the first time as well.

#### iOS

1. Open the project in Xcode by typing the following in a terminal window:
```
cd YourApp
open platforms/ios/*.xcodeproj
```

2. Make sure you are building the right target.
 * In the top left (beside Run and Stop buttons) there is a dropdown to select target project and device. Ensure that `YourApp` is selected and not `CordovaLib`. 

3. Click the Play button.

### Making changes to your app source code

Your HTML, CSS, and JavaScript files live within the `www` directory of your cca project folder. In order to see your file changes reflected, you **must** run `cca prepare` from within your project.

### Debugging

You can debug your Chrome App on mobile the same way that you debug normal Cordova applications.

_**Done? Continue to [Next Steps &raquo;](NextSteps.md)**_
