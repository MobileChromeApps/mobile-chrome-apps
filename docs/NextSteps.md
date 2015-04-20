## Step 4: Next Steps

Now that you have a working mobile Chrome App, there are lots of ways to improve the experience on mobile devices.

### `manifest.json` and `manifest.mobile.json`

Possible values for `manifest.json`:
* `name`: Full name of application
* `description`: Maps to Cordova's `<description>` tag
* `author`: Maps to Cordova's `<author>` tag
* `short_name`: E.g. used on app's launcher icon
* `icons`: See below.
* `version`: Should be in the form "x.y.z". Used to generate Android `versionCode` and iOS `CFBundleVersion`
* `permissions`: List of APIs that will be used (e.g. "identity"), as well as URL patterns to allow network access to.
* `oauth2`: Used when including the [`identity` plugin](https://github.com/MobileChromeApps/cordova-plugin-chrome-apps-identity)
* `bluetooth`: used when includeing the [`bluetooth` plugin](https://github.com/MobileChromeApps/cordova-plugin-chrome-apps-bluetooth)
* `key`: Used when using the [`identity` plugin](https://github.com/MobileChromeApps/cordova-plugin-chrome-apps-identity)

Possible values for `manifest.mobile.json`:
* Any value from `manifest.json` can appear in `manifest.mobile.json`, and will take precedence.
* Most settings (such as `name`, `icons`) can be set on a per-platform bases via:
```
    "android": {
      "name": "value1"
    },
    "ios": {
      "name": "value2"
    }
```
* `webview`: Android only. Can be `"system"` or `"crosswalk"` (default)
  * This can also be set with the `--webview` command-line flag
* `packageId`: Used as the `packageId` on Android, and the `CFBundleIdentifier` on iOS.
* `csp`: When set, overrides the default Content-Security-Policy for apps
* `cspUnsafeEval`: Allow `eval` within Content-Security-Policy (default: false)
* `cspUnsafeInline`: Allow inline scripts within Content-Security-Policy (default: false)
* `versionCode`: Android only. Sets the base `versionCode` (rather than deriving one from `version`)
* `minSdkVersion`: Android only. Sets the [minSdkVersion](http://developer.android.com/guide/topics/manifest/uses-sdk-element.html).
  * This can also be set with the `--android-minSdkVersion` command-line flag
* `targetSdkVersion`: Android only. Sets the [targetSdkVersion](http://developer.android.com/guide/topics/manifest/uses-sdk-element.html).
* `androidTheme`: Android only. E.g. `"@android:style/Theme.Translucent"`


### More about Icons

Mobile apps need a few more icon resolutions than desktop Chrome Apps.

For Android, these sizes are needed:

* 36px, 48px, 78px, 96px

For iOS apps, the required sizes differ depending on whether you support 
[iOS 6](https://developer.apple.com/library/ios/qa/qa1686/_index.html) vs 
[iOS 7+](https://developer.apple.com/library/ios/documentation/userexperience/conceptual/mobilehig/IconMatrix.html). The minimum number of icons required are:

* **iOS 6**: 57px, 72px, 114px, 144px
* **iOS 7+**: 76px, 120px, 152px, 180px

A complete icon list would look like this in your `manifest.json` file:

    "icons": {
      "16": "assets/icons/icon16.png",
      "36": "assets/icons/icon36.png",
      "48": "assets/icons/icon48.png",
      "57": "assets/icons/icon57.png",
      "72": "assets/icons/icon72.png",
      "76": "assets/icons/icon76.png",
      "78": "assets/icons/icon78.png",
      "96": "assets/icons/icon96.png",
      "114": "assets/icons/icon114.png",
      "120": "assets/icons/icon120.png",
      "128": "assets/icons/icon128.png",
      "144": "assets/icons/icon144.png",
      "152": "assets/icons/icon152.png"
      "180": "assets/icons/icon180.png"
    }

To have platform-specific icons, add the key to your `manifest.mobile.json`:

    "android": {
        "icons": {
            ...
        }
    },
    "ios":
        "icons": {
            ...
        }
    }

The icons will be copied to the appropriate places for each platform every time you run `cca prepare`.

For a good overview and examples of common problems with resizing icons, read [this answer](http://graphicdesign.stackexchange.com/questions/5269/how-to-resize-icon-sets-in-photoshop/5271#5271) on the Graphic Design Stack Exchange.

### Splash Screens

Apps on iOS show a brief splash screen as the app is loading. A set of default Cordova splash screens are included in `platforms/ios/[AppName]/Resources/splash`.  

The sizes needed are:

* 320px x 480px + 2x
* 768px x 1024px + 2x (iPad portrait)
* 1024px x 768px + 2x (iPad landscape)
* 640px x 1146px

Splash screen images are not currently modified by `cca`.

_**Done? Continue to [Special considerations when developing with Cordova &raquo;](CordovaConsiderations.md)**_
