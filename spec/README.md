# Chrome Cordova Test Suite

This is a collection of automatic and manual tests that exercise various `chrome.*` APIs from Chrome Apps v2.

## As a Mobile Chrome App

    # From mobile-chrome-apps repository:
    ./mca.js create com.google.ChromeSpec --source=spec

## As a Desktop Chrome App

* goto `chrome://extensions`
* click "Load Unpacked Extension"
* select `/path/to/spec/www`
