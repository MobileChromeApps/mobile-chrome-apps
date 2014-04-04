## Step 5: Publish

In your project's `platforms` directory, you have two complete native projects: one for Android, and one for iOS. You can build release versions of these projects and publish them to Google Play or to the iOS App Store.

### Publish to the Play Store

To publish your Android application to the Play Store:

1. Update the two Android version ids, then run `cca prepare`:
    * `android:versionName` is set using the `version` key in `www/manifest.json` (this sets the version of your desktop packaged app, too).
    * `android:versionCode` is set using the `versionCode` key in `www/manifest.mobile.js`.

2. Edit (or create) `platforms/android/ant.properties` and set the `key.store` and `key.alias` properties (as explained [in the Android developer docs](http://developer.android.com/tools/building/building-cmdline.html#ReleaseMode)).

3. Build your project:

        ./platforms/android/cordova/build --release

4. Find your signed .apk located inside `platforms/android/ant-build/`.

5. Upload your signed application to the [Google Play developer console](https://play.google.com/apps/publish).

### Publish to the iOS App Store

1. Update the app version by setting the `CFBundleVersion` key in `www/manifest.mobile.js`, then run `cca prepare`.

2. Open the Xcode project file found under your `platforms/ios` directory:

    open platforms/ios/*.xcodeproj

3. Follow Apple's [App Distribution Guide](https://developer.apple.com/library/ios/documentation/IDEs/Conceptual/AppDistributionGuide/Introduction/Introduction.html).
