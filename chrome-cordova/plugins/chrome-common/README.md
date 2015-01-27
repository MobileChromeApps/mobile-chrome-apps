# chrome-common
This plugin is a dependency for a few other chromium plugins.

# Release Notes

## 1.0.5 (Jan 27, 2015)
* chrome.runtime: fix getURL when running in Cordova (fixes #487) - Only use manifest to resolve url when running in a Chrome App - Generate correct urls when running under Cordova, based on current location
* Make all Event.fire()s equate to queueStartUpEvent calls.
* Change helpers.delayDeviceReadyUntil() and helpers.queueLifeCycleEvent()
* Allow setting error.code as well as error.message for callbackWithError()
* Don't log all errors by default, let apps handle runtime.lastError silently

## 1.0.4 (November 17,2014)
* chrome.alarms: Make it more robust and prevent onLaunched when onAlarm is the cause of the Activity starting up

## 1.0.3 (October 21, 2014)
* Documentation updates.
