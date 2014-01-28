## Special considerations when developing with Cordova

A Chrome App may not work out of the box on mobile. Some common problems with porting to mobile:

* Layout issues with small screens, especially while in a portrait orientation.
  * _Suggested fix:_ Use [CSS media queries](http://www.html5rocks.com/en/mobile/mobifying/#toc-mediaqueries) to optimize your content for smaller screens.
* Chrome Apps using Cordova will ignore your app’s requested screen size, instead using the device’s native size.
* Small buttons and links will be hard to tap with a finger.
  * _Suggested fix:_ Adjust your touch targets to be at least 44 x 44 points. 
* Unexpected behavior when relying on mouse hover which does not exist on touch screens.
  * _Suggested fix:_ In addition to hover, activate UI elements such as dropdowns and tooltips on tap.
* A 300ms tap delay.
  * _Suggested fix:_ Use the [FastClick by FT Labs](https://github.com/ftlabs/fastclick) JavaScript polyfill.
  * Read this [HTML5Rocks article](http://updates.html5rocks.com/2013/12/300ms-tap-delay-gone-away) for some background info.

### Supported Chrome APIs 

We’ve made many of the core Chrome APIs available to Chrome Apps for Mobile, including:

* [identity](http://developer.chrome.com/apps/identity.html) - sign-in users using OAuth2
* [payments](http://developer.chrome.com/apps/payments.html) - sell virtual goods within your mobile app
* [pushMessaging](http://developer.chrome.com/apps/pushMessaging.html) - push messages to your app from your server
* [sockets](http://developer.chrome.com/apps/sockets.html) - send and receive data over the network using TCP and UDP
* [notifications](http://developer.chrome.com/apps/notifications.html) (Android only) - send rich notifications from your mobile app
* [storage](http://developer.chrome.com/apps/storage.html) - store and retrieve key-value data locally
* [syncFileSystem](http://developer.chrome.com/apps/syncFileSystem.html) - store and retrieve files backed by Google Drive
* [alarms](http://developer.chrome.com/apps/alarms.html) - run tasks periodically
* [idle](http://developer.chrome.com/apps/idle.html) -  detect when the machine's idle state changes.
* [power](http://developer.chrome.com/apps/power.html) - override the system's power management features.

However, not all Chrome JavaScript APIs are implemented. And not all Chrome Desktop features are available on mobile:
  * no &lt;webview&gt; tag
  * no IndexedDB
  * no getUserMedia()
  * no NaCl

You can track progress from our [API Status](docs/APIStatus.md) page.

_**Done? Continue to [Step 4: Publish &raquo;](Publish.md)**_
