# chrome.alarms Plugin

This plugin allows apps to register alarms.

## Status

Stable on Android; not supported on iOS.

## Caveats

### Android

You have to manually change the theme to translucent in `platforms/android/AndroidManifest.xml` by changing `"Theme.Black.NoTitleBar"` to `"Theme.Translucent"` inside your `<activity>` tag.

## Reference

The API reference is [here](http://developer.chrome.com/apps/alarms.html).

# Release Notes
## 1.0.1 (March 10, 2014)
- Documentation updates.
