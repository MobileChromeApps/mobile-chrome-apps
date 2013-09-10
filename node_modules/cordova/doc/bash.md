Bash shell support
==================

Cordova CLI comes bundled with a script which provides command-line tab-completion for Bash. If you're running a sufficiently
Unix-y operating system (Linux, BSD, OS X) you can install this to make typing cordova command lines easier.

Installation
------------

### Linux

To install on a Linux or BSD system, copy the `scripts/cordova.completion` file to your `/etc/bash_completion.d` directory. This will be read the next time you start a new shell.

### OS X

On OS X, put the `scripts/cordova.completion` file anywhere readable, and add the following line to the end of your `~/.bashrc` file:

    source <path to>/cordova.completion

This will be read the next time you start a new shell.

Usage
------

It's easy! As long as your command line begins with an executable called 'cordova', just hit `<TAB>` at any point to see a list of valid completions.

Examples:

    $ cordova <TAB>
    build     compile   create    emulate   platform  plugin    prepare   serve

    $ cordova pla<TAB>

    $ cordova platform <TAB>
    add ls remove rm

    $ cordova platform a<TAB>

    $ cordova platform add <TAB>
    android     blackberry  ios         wp7         wp8         www

    $ cordova plugin rm <TAB>

    $ cordova plugin rm org.apache.cordova.<TAB>
    org.apache.cordova.file    org.apache.cordova.inappbrowser
