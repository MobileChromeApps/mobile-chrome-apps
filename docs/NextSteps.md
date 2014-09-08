## Step 4: Next Steps

Now that you have a working mobile Chrome App, there are lots of ways to improve the experience on mobile devices.

### Mobile Manifest

There are certain Chrome App settings that only apply to mobile platforms.  We have created a `www/manifest.mobile.json` file to contain these, and the specific values are referenced throughout the plugin documentation and this guide.

You should adjust the values here accordingly.

### Icons

Mobile apps need a few more icon resolutions than desktop Chrome Apps.

For Android, these sizes are needed:

* 36px, 48px, 78px, 96px

For iOS apps, the required sizes differ depending on whether you support 
[iOS 6](https://developer.apple.com/library/ios/qa/qa1686/_index.html) vs 
[iOS 7](https://developer.apple.com/library/ios/documentation/userexperience/conceptual/mobilehig/IconMatrix.html). The minimum number of icons required are:

* **iOS 6**: 57px, 72px, 114px, 144px
* **iOS 7**: 72px, 120px, 152px

A complete icon list would look like this in your `manifest.json` file:

    "icons": {
      "16": "assets/icons/icon16.png",
      "36": "assets/icons/icon36.png",
      "48": "assets/icons/icon48.png",
      "57": "assets/icons/icon57.png",
      "72": "assets/icons/icon72.png",
      "78": "assets/icons/icon78.png",
      "96": "assets/icons/icon96.png",
      "114": "assets/icons/icon114.png",
      "120": "assets/icons/icon120.png",
      "128": "assets/icons/icon128.png",
      "144": "assets/icons/icon144.png",
      "152": "assets/icons/icon152.png"
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
