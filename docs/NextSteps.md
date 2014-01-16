# Next steps with Mobile Chrome Apps

Now that you have a working mobile Chrome app, there are lots of ways to improve the experience on mobile devices. (If you don't yet have a working mobile Chrome app, go back to the [Getting Started Guide](GettingStarted.md).)

## Application Polish

### Icons

Mobile apps need a few more icons than desktop Chrome apps. We don't (currently) do any automatic processing of your icon assets, so if you are porting an existing app, you'll need to re-render your icons at some new sizes. For new apps, your manifest will come with a sample icon in all of the sizes needed for iOS, Android and desktop.

For Android, these sizes are needed:
    36px, 48px, 78px, 96px

For iOS, these sizes are needed:
    57px, 72px; plus the corresponding 2x version.

A complete icon list would look like this in your `manifest.json` file:

    "icons": {
      "16": "assets/icons/icon16.png",
      "36": "assets/icons/icon36.png",
      "48": "assets/icons/icon48.png",
      "57": "assets/icons/icon57.png",
      "72": "assets/icons/icon72.png",
      "96": "assets/icons/icon96.png",
      "114": "assets/icons/icon114.png",
      "128": "assets/icons/icon128.png",
      "144": "assets/icons/icon144.png"
    }

The icons will be copied to the appropriate places for each platform every time you run `mca prepare`.

Note: iOS has several additional icons requirements that you'll need to manually copy to  `platforms/ios/[AppName]/Resources/icons`.  Those sizes include:
    29px, 40px, 50px, 60px, 76px; plus the corresponding 2x version

### Splash Screens

Apps on iOS show a brief splash screen as the app is loading.  A set of default Cordova splash screens are included in `platforms/ios/[AppName]/Resources/splash`.  

The sizes needed are:
  320px x 480px + 2x 
  768px x 1024px + 2x (iPad portrait)
  1024px x 768px + 2x (iPad landscape)
  640px x 1146px

## Publishing your App

### Google Play Store (Android)

### iOS App Store (iOS)

## Experiencing Hiccups?

Please [reach out to us](mailto:mobile-chrome-apps@googlegroups.com).

## Done?

Read the [API Status document](APIStatus.md).
