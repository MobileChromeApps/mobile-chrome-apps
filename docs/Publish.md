## Step 5: Publish

In your project's `platforms` directory, you have two complete native projects: one for Android, and one for iOS. You can build release versions of these projects and publish them to Google Play or to the iOS App Store.

### Publish to the Play Store

To publish your Android application to the Play Store:

1. Ensure that your app details are set.
    * `android:versionName` is set using the `version` key in `www/manifest.json`.
       * This also sets the version of your desktop packaged app.
    * `android:versionCode` can be set using the `versionCode` key in `www/manifest.mobile.js`.
       * If omitted, `versionCode` will default to `major * 10000 + minor * 100 + rev` (assuming `version` looks like `"major.minor.rev"`)
       * Finally, a digit is appended to the versionCode to distinguish the apk type:
         * 0 - multi architecture
         * 2 - arm
         * 4 - x86
         * 9 - APK using system webview and `minSdkVersion >= 20`

2. Generate a keystore and key pair (as explained [in the Android developer docs](http://developer.android.com/tools/publishing/app-signing.html#signing-manually)).
   ```
   cca exec keytool -genkey -v -keystore keys.p12 -alias ReleaseKey -keyalg RSA -keysize 2048 -validity 10000 -storetype PKCS12
   ```
  * Create a password when prompted
  * Note: the "cca exec" prefix is required only if keytool is not already available on your PATH
  * To retrieve your certificate's fingerprint (needed when using `chrome.identity`):
    * `cca exec keytool -list -v -keystore keys.p12 -storetype PKCS12`


3. Put the following settings into a file called `android-release-keys.properties` at the root of your project (as a sibling to `www/`):

    ```
    storeFile=keys.p12
    storePassword=YOUR_STORE_PASSWORD
    keyAlias=ReleaseKey
    keyPassword=YOUR_KEY_PASSWORD
    ```
    * Note: `storePassword` and `keyPassword` are optional. If omitted, you will be prompted for them when building.
    * Note: You can likewise create an `android-debug-keys.properties`

4. We recommend that you use 3 APKs when publishing:
   ```
   # Creates ARM and x86 APKs
   cca build android --release --webview=crosswalk
   # Creates Cross-platform apk with higher versionCode
   cca build android --release --webview=system --android-minSdkVersion=21
   ```

5. Find your signed .apk(s) at `platforms/android/out/*-release.apk`.

6. Upload your signed application to the [Google Play developer console](https://play.google.com/apps/publish).
   * Use `advanced mode` to publish multiple APKs, as described by the [Multiple APKs docs](http://developer.android.com/google/play/publishing/multiple-apks.html).

### Publish to the iOS App Store

1. Update the app version by setting the `CFBundleVersion` key in `www/manifest.mobile.js`. If not explicitly set, `CFBundleVersion` will default to the same value as `version`. If `version` contains a dash, only the part before the dash will be used for `CFBundleVersion`.

2. Run `cca prepare`.

2. Open the Xcode project file found under your `platforms/ios` directory:

    open platforms/ios/*.xcodeproj

3. Follow Apple's [App Distribution Guide](https://developer.apple.com/library/ios/documentation/IDEs/Conceptual/AppDistributionGuide/Introduction/Introduction.html).
