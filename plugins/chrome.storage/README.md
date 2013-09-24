# chrome.storage Plugin

Provides an implementation chrome.storage.local and chrome.storage.sync (but does not actually sync).

Status: Stable

Refer to docs at: [https://developer.chrome.com/apps/storage.html](https://developer.chrome.com/apps/storage.html)

Example usage:

  chrome.storage.local.set({'key':'value'});
  chrome.storage.local.get('key', function(obj) {
    alert(obj.key);
  });
