blob-constructor
================

A Cordova plugin which provides Blob() constructor syntax for versions of Android
which do not support it.

##Overview

This plugin adds support for a the Blob() constructor syntax, which should be
preferred in Chrome apps over the BlobBuilder interface. (See
http://updates.html5rocks.com/2012/06/Don-t-Build-Blobs-Construct-Them)

##Installation

### Cordova 2.7 or later with cordova cli and Plugman

*   Assuming you've used cordova create to create the platforms, you can use
        cordova plugin add directory-of-the-blob-constructor-plugin
    to add the plugin

##Usage

    var blob = new Blob(['Today is a good day'], {type: 'text/x-optimistic'});
