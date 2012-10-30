# Integration layer for Chrome Apps in Cordova

This directory contains the files used to wrap a Chrome app and make it run using Cordova.
Notes about the integration:

* `background.js`: To be replaced with your app's background page. Remember to change its name in `manifest.json`. Have the background page `window.create` your own `index.html`, not `chromeapp.html`.
* `manifest.json`: Can be replaced with your app's manifest. Nothing special about Cordova here. Point it at the background page.
* `chromeapp.html`: **When you create your Cordova project, point it at this file, not `index.html`!** But otherwise you shouldn't need to edit this.
* `chromebgpage.html`: More or less empty. Toss it into the project.
* Acquire the Chrome API Javascript:
    * Go into the `api/` directory.
    * Run `grunt`. If you don't have Grunt installed, `sudo npm install -g grunt`.
    * Symlink (or copy, not recommended) `api/dist/chromeapi.js` into your project as well.
        * You can use `api/dist/chromeapi.min.js` instead, and modify the filename in `chromeapp.html`.

