# Chrome Apps API Test Suite

This is a collection of automatic and manual tests that exercise various `chrome.*` APIs from Chrome Apps v2, intented to test both desktop and mobile (via the `cca` tool) for feature correctness and parity.

## As a desktop Chrome App

* In chrome, visit `chrome://extensions`
  * Make sure you have Developer Mode enabled
* Click "Load Unpacked Extension"
* Select the directory this README is in (should also have a `manifest.json` file)

## As a mobile Chrome App

* Make sure you have `cca` properly installed (Follow the [Installation Guide](https://github.com/MobileChromeApps/mobile-chrome-apps/blob/master/docs/Installation.md))
* Use the `dev-bin/create-spec.sh` script at the root of this repository.

