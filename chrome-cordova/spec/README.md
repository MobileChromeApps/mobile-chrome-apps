# Chrome Cordova Test Suite

This is a collection of automatic and manual tests that exercise various `chrome.*` APIs from Chrome Apps v2.

## As a mobile Chrome App

    # From mobile-chrome-apps repository:
    cca create ChromeSpec --link-to=spec

## As a desktop Chrome App

* goto `chrome://extensions`
* click "Load Unpacked Extension"
* select `/path/to/spec/www`
