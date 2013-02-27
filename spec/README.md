# Chrome Cordova Test Suite

This is a collection of automatic and manual tests that exercise various `chrome.*` APIs from Chrome Apps v2.

## Installation

Designed to be used as a cordova-cli plugin:

    cordova plugin add /path/to/this/directory

Alternatively, point Chrome's "Load Unpacked Extension" at `www/` to load the tests in desktop Chrome.

Note that there are some symlinks in here that need to be expanded. cordova-cli will do this, but Chrome does not.
