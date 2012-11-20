# Chrome Apps for Mobile

APIs, integration ~~shiv~~ shim and tests for running Chrome Apps on mobile using Apache Cordova.

These tools are at a very early pre-alpha stage. Don't use them; you have been warned.

## Components

* APIs live under `api/`.
* Chrome-spec test suite is in `spec/`.
* Integration bits and instructions are in `integration/`.

## Building

What is built:
* The APIs are combined into a single grunt _ output/chromeapi.js file.
* The spec tests are cloned into grunt _ output/spec for use as Chrome unpacked extensions.
* The spec tests are cloned into grunt _ output/cordova _ spec for use as a Cordova application.

How to build:
1. Run `sudo npm install -g grunt` to install Grunt (build tool).
1. Run `npm install` to install dependencies into your node _ modules directory.
1. Run `grunt` to do a one-time build, `grunt watch` to start continuous build mode.
