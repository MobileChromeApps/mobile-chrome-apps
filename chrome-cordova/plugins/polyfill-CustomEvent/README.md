customEvent
===========

A Cordova plugin which provides the CustomEvent constructor API to Android browsers

##Overview

See https://developer.mozilla.org/en-US/docs/DOM/Event/CustomEvent for the full
API.

The CustomEvent constructor is a relatively recent (DOM Level 4) interface to
build custom DOM events, which can then be thrown and caught by registered event
listeners. It is supported by Chrome and Safari, but not by the Android webview
(at least as of 4.2.2). This plugin provides that interface to Android-based
Cordova apps.

##Installation

### Cordova 2.7 or later with cordova cli and Plugman

*   Assuming you've used cordova create to create the platforms, you can use
        cordova plugin add directory-of-the-customEvent-plugin
    to add the plugin

##Usage

### Basic usage

    var newEvent = new CustomEvent("myAwesomeEvent");

### Full example

    // Register an event listener
    document.addEventListener("alert_needed", function(e) {
        alert("An alert was needed, so now you got one!");
    });

    // Create the custom event
    var make_an_alert = new CustomEvent("alert_needed",
        { bubbles: true,
          cancelable: false,
          details: "It's a custom event"
        });

    // Fire the event
    document.dispatchEvent(make_an_alert);
