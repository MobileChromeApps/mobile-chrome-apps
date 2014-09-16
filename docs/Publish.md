## Step 5: Publish

In your project's `platforms` directory, you have two complete native projects: one for Android, and one for iOS. You can build release versions of these projects and publish them to Google Play or to the iOS App Store.

### Publish to the Play Store

To publish your Android application to the Play Store:

1. Ensure that your app version is set:
    * `android:versionName` is set using the `version` key in `www/manifest.json` (this sets the version of your desktop packaged app, too).
    * `android:versionCode` can be explicitly set using the `versionCode` key in `www/manifest.mobile.js`. If omitted, `versionCode` will default to `major * 10000 + minor * 100 + rev` (assuming `version` looks like `"major.minor.rev"`)

2. Create (or update) your keystore (as explained [in the Android developer docs](http://developer.android.com/tools/publishing/app-signing.html#signing-manually)).

        keytool -genkey -v -keystore KEYSTORE_NAME.keystore -alias ALIAS -keyalg RSA -keysize 2048 -validity 10000

3. Create a file called `android-release-keys.properties`, and put into it:

      keyAlias=ALIAS
      keyPassword=????
      storeFile=KEYSTORE_NAME.keystore
      storePassword=????

4. Build your project:

        cca build --release

5. Find your signed .apk(s) at `platforms/android/out/*-release.apk`.

6. Upload your signed application to the [Google Play developer console](https://play.google.com/apps/publish).

### Publish to the iOS App Store

1. Update the app version by setting the `CFBundleVersion` key in `www/manifest.mobile.js`. If not explicitly set, `CFBundleVersion` will default to the same value as `version`. If `version` contains a dash, only the part before the dash will be used for `CFBundleVersion`.

2. Run `cca prepare`.

2. Open the Xcode project file found under your `platforms/ios` directory:

    open platforms/ios/*.xcodeproj

3. Follow Apple's [App Distribution Guide](https://developer.apple.com/library/ios/documentation/IDEs/Conceptual/AppDistributionGuide/Introduction/Introduction.html).
