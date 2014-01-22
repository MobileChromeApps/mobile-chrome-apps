# Next Steps

Now that you have a working mobile Chrome App, there are lots of ways to improve the experience on mobile devices. (If you don't yet have a working mobile Chrome App, go back to the [Getting Started Guide](GettingStarted.md).)

## Application Polish

### Icons

Mobile apps need a few more icons than desktop Chrome apps. We don't (currently) do any automatic processing of your icon assets, so if you are porting an existing app, you'll need to re-render your icons at some new sizes. For new apps, your manifest will come with a sample icon in all of the sizes needed for iOS, Android and desktop.

For Android, these sizes are needed:
    36px, 48px, 78px, 96px

For iOS, these sizes are needed:
    57px, 72px, 114px, 144px

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

The icons will be copied to the appropriate places for each platform every time you run `cca prepare`.

### Splash Screens

## Publishing your App

### Google Play Store (Android)

### iOS App Store (iOS)

## Experiencing Hiccups?

Please [reach out to us](mailto:mobile-chrome-apps@googlegroups.com).

## Done?

Read the [API Status document](APIStatus.md).
