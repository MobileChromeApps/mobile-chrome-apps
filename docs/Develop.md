## Step 3: Develop

### Tools Overview

![Using CDE, cca, and CADT to develop Chrome Apps for Mobile](images/cde-cadt-diagram.png)

#### [Chrome App Developer Tool for Mobile (CADT)](https://github.com/MobileChromeApps/chrome-app-developer-tool/)

CADT is an app for your mobile development device that makes it quick and easy to see your code in action. It provides the Cordova framework of Chrome Apps for Mobile so you can test your code by simply pushing your Chrome App assets to your mobile device (made easy with our tools), which is much faster than packaging up the entire mobile app. This is called **live deploy**.

With CADT running on your mobile device, live deploy can be initiated from your development computer with either Chrome Dev Editor or the `cca` command line tool, allowing you to instantly preview the Chrome App you're editing, running right on Android or iOS. When you make a change to the code in your editor, you're a quick push away from seeing it straight on your device.

#### [The `cca` Command Line Tool](https://github.com/MobileChromeApps/mobile-chrome-apps)

`cca` provides all the functionality you need to develop and package Chrome Apps for Mobile from the command line. Use it with CADT to rapidly iterate on your code: live deploy allows you to instantly see your Chrome App running on a connected mobile device. When you are ready to publish your Chrome App for Mobile to the Apple App Store and Google Play Store, use `cca` to bundle up your Chrome App into the proper mobile packages.

#### [Chrome Dev Editor (CDE)](https://github.com/dart-lang/chromedeveditor)

CDE is an IDE built specifically for Chrome Apps. Use it with CADT for live deploy.

### Run your Chrome App for Mobile

There are three different workflows that you can use to run your application:

* **Option A**: Live deploy with CADT (quick and easy, but not *everything* works!)
* **Option B**: Use `cca` to package your application and deploy it to your mobile device
* **Option C**: Use a third party IDE, such as Eclipse or Xcode. The use of a third party IDE is entirely optional (but often useful) to assist with launching, configuring, and debugging your hybrid mobile application.

### Option A: Live deploy with CADT (quick and easy!)

1. Follow these [instructions](https://github.com/MobileChromeApps/chrome-app-developer-tool/#installation) to install CADT on your mobile device.

  **Note:** Remove all older versions of CADT from your mobile device so that only the latest version remains.

2. Use either `cca` or CDE as your tool to initiate live deploy from your development computer.

3. Enjoy live deploy! First, run CADT on your mobile device. Then:

####`cca`

Navigate to your Chrome App's directory. Then deploy:

* IP deploy: `cca push --target=IP_ADDRESS`	
* USB deploy:
	* **Android:** As of `cca@0.6.0`, no manual port forwarding is required!
	* **iOS:** To setup, obtain [tcprelay.py](https://github.com/chid/tcprelay) and use `adb tcprelay.py 2424:2424`
	* Use `cca push`
* **New! &raquo;** Use `cca push [--target=IP_ADDRESS] --watch` to begin **continuous live deploy**: the Chrome App is automatically refreshed when the code is updated.

#### CDE

Select your Chrome App. From the menu (the icon is three horizontal bars in the top left corner), select `Deploy to Mobile...` and follow the instructions.

### Option B: Use `cca` to package your application and deploy it to your mobile device

From the root of your `cca`-generated project directory:

#### Android

* To run your app on the Android Emulator: `cca run android --emulator`
  * **Note:** This requires that you have set up an emulator. You can run `android avd` to set this up. Download additional emulator images by running `android`. To make the intel images run faster, install [Intel's HAXM](http://software.intel.com/en-us/articles/intel-hardware-accelerated-execution-manager/).
* To run your app on a connected ARM Android device: `cca run android --device`.
* To run on a specific target: `cca run android --target=foo`
* To see a list of available targets: `cca run android --list`

#### iOS

* To run your app on the iOS Simulator: `cca run ios --emulator`
* To run your app on a connected iOS device: `cca run ios --device`
  * **Note**: To run on a connected iOS device, you must set up a [Provisioning Profile](http://stackoverflow.com/questions/3362652/what-is-a-provisioning-profile-used-for-when-developing-iphone-applications) for that device.
* To run on a specific target: `cca run ios --target=foo`
* To see a list of available targets: `cca run ios --list`

### Option C: Develop and build using an IDE

#### Android

1. In Android Studio, select `Import Project`
2. Import from the `platforms/android` directory that was created within your project.
3. Click the play button to run your app.

#### iOS

1.  Open the project in Xcode by typing the following in a terminal window:

        cd YourApp
        open platforms/ios/*.xcodeproj


2.  Make sure you are building the right target.

    In the top left (beside Run and Stop buttons), there is a dropdown to select target project and device. Ensure that `YourApp` is selected and not `CordovaLib`.

3.  Click the play button.

### Making changes to your app source code

Your HTML, CSS and JavaScript files live within the `www` directory of your cca project folder.

**Important**: When using an IDE, you must manually run `cca prepare` before deploying your application. If you are deploying using `cca` on the command-line, the prepare step is done automatically.

### Debugging

You can debug your Chrome App for Mobile the same way that you [debug standard Cordova applications](https://github.com/phonegap/phonegap/wiki/Debugging-in-PhoneGap).

**Important**: In order to use [remote debugging with chrome web inspector for Android](https://developer.chrome.com/devtools/docs/remote-debugging), your desktop Chrome version should match the Chrome WebView on Android. In practice, this usually means you should be debugging using Chrome Dev/Canary. (If there is a version mismatch, usually the chrome web inspector window appears completely blank.)

_**Done? Continue to [Step 4: Next Steps &raquo;](NextSteps.md)**_
