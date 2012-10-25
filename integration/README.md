# Integration layer for Chrome Apps in Cordova

This directory contains the files used to wrap a Chrome app and make it run using Cordova.
Notes about the integration:

* `background.js`: To be replaced with your app's background page. Remember to change its name in `manifest.json`. Have the background page `window.create` your own `index.html`, not `chromeapp.html`.
* `manifest.json`: Can be replaced with your app's manifest. Nothing special about Cordova here. Point it at the background page.
* `chromeapp.html`: **When you create your Cordova project, point it at this file, not `index.html`!** But otherwise you shouldn't need to edit this.
* `chromebgpage.html`: More or less empty. Toss it into the project.
* Symlink (or copy, not recommended) `api/chromeapi.js` into your project as well.

