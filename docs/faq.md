# Frequently Asked Questions

## General Questions

### Do Chrome Apps for Mobile run inside the Chrome Browser?

No. Chrome Apps for Mobile are first-class native apps that run independent of the Chrome Browser. They are hybrid apps, which means they leverage a WebView component, not the Chrome Browser, to display content within the Android/iOS application.


### Which WebView do Chrome Apps for Mobile use?

- **Android**: [Crosswalk WebView](https://crosswalk-project.org) is bundled by default, but you can choose to use the [system WebView](http://developer.android.com/reference/android/webkit/WebView.html). See our [Crosswalk documentation](Crosswalk.md) for more information.
- **iOS**: [UIWebView](https://developer.apple.com/library/ios/documentation/uikit/reference/UIWebView_Class/Reference/Reference.html).


### How are Chrome Apps for Mobile distributed to users?  Are they installed through the Chrome Web Store?

Chrome Apps for Mobile are first-class native apps and [distributed by publishing to the Play Store (Android) or App Store (iOS)](https://github.com/MobileChromeApps/mobile-chrome-apps/blob/master/docs/Publish.md).  They are not installed from the Chrome Web Store.


### How do Chrome Apps for Mobile compare with Apache Cordova (or PhoneGap) apps?

Chrome Apps for Mobile are actually built on top of [Apache Cordova](https://cordova.apache.org/), and most of our work has gone directly into that project.


### What Web APIs are supported?

Core web features vary by the underlying WebView (e.g. iOS 6 vs iOS 7 vs Android vs Crosswalk).


### Which Chrome APIs are supported?

Chrome API support is tracked within [APIsAndLibraries.md](https://github.com/MobileChromeApps/mobile-chrome-apps/blob/master/docs/APIsAndLibraries.md).


### Is NaCL / PNaCL supported?

No. However, you can still compile and use native code by writing a custom Cordova plugin.


### Why use CCA rather than Cordova?

- Support both desktop and mobile!
- Background page & [lifecycle events](Events.md)
- A more opinionated workflow
- More reasons: [Stack Overflow](http://stackoverflow.com/questions/21684414/reasons-for-porting-a-cordova-app-to-a-mobile-chrome-app/)


### Do CCA plugins work in vanilla Cordova projects?

Yes. Read their documentation, though, as some plugins may require additional configuration when used outside of a mobile Chrome App.


### Can I use Cordova plugins within CCA apps?

Yes. `cca` [forwards commands](http://stackoverflow.com/questions/21886407/chrome-cordova-app-plugin-access/) to `cordova`, so the following will work:

    cca plugin add [PLUGIN_ID or GIT_URL or LOCAL_PATH]

One caveat though - when using `cca push` and the Chrome App Developer Tool, only plugins built into the tool will be avaiable.


### How do I update my version of the CCA tool?

    npm install -g cca


### Something doesn't work. How can I ask for help?

File a [GitHub Issue](https://github.com/MobileChromeApps/mobile-chrome-apps/issues).


### Why does Hello World produce a >20mb APK?

By default, `cca` uses a bundled WebView ([Crosswalk](https://crosswalk-project.org)), rather than the system WebView.


### Why use the Crosswalk WebView?

On pre-L devices, Crosswalk provides much better performance and a newer web runtime than the stock Android WebView. However, there are [tradeoffs](https://github.com/MobileChromeApps/mobile-chrome-apps/blob/master/docs/Crosswalk.md

### Do CCA Apps violate CSP?

As of `cca@0.6.0` (March 2015), CCA apps have use [the same Content-Security-Policy](https://developer.chrome.com/apps/contentSecurityPolicy) as desktop Chrome Apps.


## How To

### Is it possible to create multiple windows in CCA apps?

No. However, if you have a use-case for wanting to, we'd love to hear about it. :).


### How do I use Polymer with CCA apps?

* __Android with Crosswalk__: Polymer works without the need for polyfills.
* __Android without Crosswalk__:
  * pre-KitKat: Polymer does not work.
  * KitKat: Polymer works and requires its polyfills.
  * Android L+: Polymer works without the need for polyfills.
* __iOS 6, 7, 8<sup>1</sup>__: Polymer works and requires its polyfills.

<sup>1</sup> Cordova support for WKWebView is still under development.

Chrome apps on both mobile and desktop require using the
[vulcanize](http://www.polymer-project.org/articles/concatenating-web-components.html) tool with the `--csp` flag.


### How do I sync data between mobile and desktop Chrome Apps (e.g. with Drive)?

http://stackoverflow.com/questions/22885267/sync-data-between-android-app-and-chrome-app-using-google-drive/

Neither `chrome.storage.sync` nor `chrome.syncFileSystem` are supported within CCA. However, you can use `chrome.identity` to obtain a Google auth token, and use that with the [Drive API](https://developers.google.com/drive/web/quickstart/quickstart-js) to sync files.


### How do I change the color of the status bar on iOS?

See Stack Overflow answer: http://stackoverflow.com/questions/21673797/set-status-bar-color-using-chrome-mobile-apps/


## Workflow Questions

### What files should I check into source control?

Generally, it's best to check in only files that you've edited, and not those generated by `cca`. In addition, it's helpful to use a script or README instructions that will create the Cordova workspace based on what you have checked in. E.g.:

    cca create GeneratedProject --link-to=/path/to/project/src

### When should I use `cca` vs the Chrome Dev Editor?

Use the [Chrome Dev Editor](https://chrome.google.com/webstore/detail/chrome-dev-editor-develop/pnoffddplpippgcfjdhbmhkofpnaalpg) when:
- You cannot (or do not want to) install Node or Android/iOS SDKs
- You would like an IDE that helps with Chrome App development
- You are developing on a Chromebook

Use `cca` when:
- You want to create `.apk` or `.ipa` files for uploading to the Play Store / App Store
- You would like to add custom Cordova plugins or make edits to native code
- You would like a command line tool to go along with your editor of choice

Aside from that, use whichever you prefer.  Using them interchangeably on the same source directory will work just fine. :)

### Can I use Xcode / Eclipse / Android Studio with CCA projects?

Xcode and Android Studio: yes.

Eclipse: No (since it doesn't support Android's gradle build system)

Using Xcode and Android Studio is often really useful when developing your own Cordova plugins. Use the Xcode / Android Studio project files within the `platforms/ios` and `platforms/android` directories respectively. BUT REMEMBER! When making edits to files within these IDEs, you will be editing __copies__ of the files that are clobbered when running `cca` commands.
