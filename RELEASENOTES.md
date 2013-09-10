
## Release Notes for Mobile Chrome Apps

### Sept 10, 2013
mobile-chrome-apps:
* mca.js to halt on cordova-cli failure
* Automatically add to plugins and whitelist based on manifest.json
* Create new cordova apps using values from imported manifest.json (such as app name)
* Add Cordova network-information plugin
* Add chrome-navigation plugin
* mca.js create is ~35% faster

chrome-cordova:
* Adds google-play-services library automatically
* Support whitelists! No more CORS errors when running app from default chrome-extension URL
* Fix Android multicast sockets, getInfo, and getNetworkList
* Adding chrome.pushMessaging for android
* Adding notifications for android
* Many chrome.identity fixes
* chrome.runtime.id to return mpdecimal encoding of manifest public key
* chrome.runtime breakout from bootstrap, so most plugins work on vanilla cordova apps
