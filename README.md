# Chrome Apps for Mobile

APIs, integration ~~shiv~~ shim and tests for running Chrome Apps on mobile using Apache Cordova.

These tools are at a very early alpha stage. Don't use them; you have been warned.

## Components

* APIs live under `plugins/`.
    * Some APIs (socket, storage, etc.) have standalone plugins and are optional. They can be used with just `plugins/common`, `plugins/bootstrap` is not necessary if the app is not a Chrome app.
    * `plugins/common` contains generic things like `chrome.Event` that are used everywhere.
    * `plugins/bootstrap` contains the main Chrome `runtime` and `window` APIs, and the HTML wrapper `chromeapp.html` used to bootstrap a Chrome app on Cordova.
* Chrome-spec test suite is in `spec/`.
* Example Chrome app files like `manifest.json` are in `templates/`.

## Building

Currently the only thing built when running `grunt` is the spec tests. These are cloned into `grunt_output/spec` for use as a Chrome unpacked extension, or for copying into a Cordova project's `www/`.


How to build:
1. Run `sudo npm install -g grunt-cli` to install Grunt (build tool).
1. Run `npm install` to install dependencies into your `node_modules` directory.
1. Run `grunt` to do a one-time build, `grunt watch` to start continuous build mode.
