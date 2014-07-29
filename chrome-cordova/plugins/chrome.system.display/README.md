# chrome.system.display Plugin

This plugin provides the ability to query display metadata.

## Caveats

### Android

`chrome.system.display.getInfo` is the only method to be implemented for now.
Please be aware that `mirroringSourceId`, `isInternal` and `isEnabled` cannot
be retrieved.

## Status

Alpha quality on Android; not yet supported on iOS.

## Reference

The API reference is [here](https://developer.chrome.com/apps/system_display).
