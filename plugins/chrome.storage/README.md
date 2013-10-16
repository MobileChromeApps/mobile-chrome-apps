# chrome.storage Plugin

This plugin provides allows apps to use local storage.

## Status

Stable on Android and iOS.

## Reference

The API reference is [here](https://developer.chrome.com/apps/storage.html).

## Example Usage

    chrome.storage.local.set({'key' : 'value'});
    chrome.storage.local.get('key', function(obj) {
      alert(obj.key);
    });

## Notes

* Both `chrome.storage.local` and `chrome.storage.sync` are available, but the latter does not actually sync.
