## Special considerations

### Chrome Apps limitations compare to Cordova

If you're new to Chrome Apps, the biggest gotcha is that some [web features are disabled](http://developer.chrome.com/apps/app_deprecated). However, several of these do currently work within Cordova.

### When porting a Chrome App to mobile

A Chrome App may not work out of the box on mobile. Some common problems with porting to mobile:

* Layout issues with small screens, especially while in a portrait orientation.
  * _Suggested fix:_ Use [CSS media queries](http://www.html5rocks.com/en/mobile/mobifying/#toc-mediaqueries) to optimize your content for smaller screens.
* Chrome App window sizes set via [chrome.app.window](http://developer.chrome.com/apps/app_window.html) will be ignored, instead using the device's density-adjusted dimensions.
  * _Suggested fix:_ Remove hard-coded window dimensions; design your app with different sizes in mind.
* Small buttons and links will be hard to tap with a finger.
  * _Suggested fix:_ Adjust your touch targets to be at least 44 x 44 points. 
* Unexpected behavior when relying on mouse hover which does not exist on touch screens.
  * _Suggested fix:_ In addition to hover, activate UI elements such as dropdowns and tooltips on tap.
* A 300ms tap delay on iOS
  * _Suggested fix:_ Use the [FastClick by FT Labs](https://github.com/ftlabs/fastclick) JavaScript polyfill.
  * Read this [HTML5Rocks article](http://updates.html5rocks.com/2013/12/300ms-tap-delay-gone-away) for some background info.
* Flashes when tapping on things
  * _Suggested fix:_ Add `-webkit-tap-hightlight-color` and `-webkit-touch-callout` to your CSS

#### Supported Chrome APIs 

We've made many of the core Chrome APIs [available to Chrome Apps for Mobile](APIsAndLibraries.md).

However, not all Chrome JavaScript APIs are implemented. And not all Chrome Desktop features are available on mobile:

  * no `<webview>` tag
  * no NaCl
  * no IndexedDB on iOS
  * no getUserMedia() on iOS


_**Done? Continue to [Step 5: Publish &raquo;](Publish.md)**_
