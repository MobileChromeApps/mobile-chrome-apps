## Special considerations when developing with Cordova

A Chrome App may not work out of the box on mobile. Some common problems with porting to mobile:

* Layout issues with small screens, especially while in Portrait orientation.
* Chrome Apps using Cordova will ignore your app’s requested screen size, instead using the device’s native size.
* Small buttons and links will be hard to tap with a finger.
* Unexpected behavior when relying on mouse hover which does not exist on touch screens.
* Not all Chrome JavaScript APIs are implemented.
  * Track progress from our [API Status](docs/APIStatus.md) page.
* Not all Chrome Desktop features are available on mobile:
  * no <webview> tag
  * no IndexedDB
  * no getUserMedia()
  * no NaCl