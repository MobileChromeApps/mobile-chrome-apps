## v0.9.18 - July 8, 2013

Pre-install script (on Windows) causes failure to install via npm
The PATCH HTTP method is not supported by the XHR proxy
`ripple emulate` should allow static server to 404 if html is not found
Fixing Contacts API for correct functioning with cordova versions later than 2.2.0
Implemented confirm function in notification js for Cordova
Fixed touchend touches and targetTouches
Fixed `response` spelling in JSONP XHR proxy
General spelling fixes

## v0.9.17 - May 30, 2013

* Fixed Ripple load bug for default load param in CLI
* Updated license headers
* Updated jsDOM dependencies
* Updated jasmine loading from submodules to using Bower

## v0.9.16 - March 22, 2013

* Added support for serve app from multiple folders
* Fixed browser tests to run again
* added device selection to enableRipple qs param
* Skinned devices now have ther size divided by the css pixel ratio

## v0.9.15 - March 08, 2013

* Updated version to 0.9.15 due to republishing need on Chrome Store as per this issue: https://groups.google.com/a/chromium.org/forum/?fromgroups=#!topic/chromium-extensions/d56BP7CTU-M

## v0.9.14 - March 06, 2013

Pull Request (for release commits): https://github.com/blackberry/Ripple-UI/pull/737

* Added support for Cordova/PhoneGap Globalization API
* Added Start / Stop methods to Cordova/PhoneGap compass API
* Fixed Ripple not working with Cordova 2.5.0
* Added Nexus 4 device
* Added support for hosted Ripple through CLI https://github.com/blackberry/Ripple-UI#running-inside-other-web-browsers

## v0.9.13 - February 05, 2013

Pull Request (for release commits): https://github.com/blackberry/Ripple-UI/pull/710

* Added support for BlackBerry Z10 device
* Added support for Blackberry Q10 device
* Added support for OPTIONS verb for Cross Origin Proxy
* Added JavaScript console clearing prior to bootup (Chrome v23+ only)
* Fixed blobBuilder being deprecated (community contribution by @maxme)

## v0.9.12 - January 14, 2013

Pull Request (for release commits): https://github.com/blackberry/Ripple-UI/pull/683

* Fixed cross origin proxy bug. Updated to new URL.

## v0.9.11 - January 12, 2013

Pull Request (for release commits): https://github.com/blackberry/Ripple-UI/pull/675

* Updated resizer to divide device pixels by css pixel ratio when formatting the iframe. Changed affected devices
* Added the Acer A500 device
* Fixed `utils.rippleLocation()` returning wrong value if path has "." in it
* Fixed UI getting messed up when using RTL dir attribute (on body of Ripple's client UI)
* Updated two torch models (9810 and 9850/60) PPI numbers per RIM specs
* Updated (RIM Chrome Extension) updates.xml to include the correct path to the crx as it changed with the micro site refresh
* Updated Cross origin (HTTPS) XHR proxy URL to be https (so calls use SSL between client & server)
* Fixed don't panic screen showing up when in file:/// scheme
* Fixed webworksready event firing multiple times when iframe was refreshed
* Fixed dark UI theme font (was using 'Helevetica', vs 'Helvetica')
* Fixed the error window dialog (css) font (was using 'Helevetica', vs 'Helvetica')
* Added parseUrl method to utils
* Fixed XHR requests to localhost with different ports not being proxied
* Update OpenLayers to v2.12
* Fixed user-agent not being set properly (in BlackBerry distribution of Ripple
* Fixed Ripple sending bad Accept (or other) headers to servers (in BlackBerry distribution of Ripple)
* Fixed the Accelerometer UI when it would stop modifying Alpha values after resetting all values (by double clicking on the UI)
* Fixed the sizing of the image (overlay) that shows up after selecting image (for an emulated Camera capture call) to fit inside the overlay window
* Fixed the platform selection page that shows up at first run displaying over top of the EULA (in the BlackBerry distribution)
* Updated the "Stay On This Page" dialog to only show up when page enters reload loop (vs every refresh)

* WebWorks BB10
  * Added support for blackberry.invoke.card.invokeCamera
  * Added support for BB10 webkitBattery
  * Added support for blackberry.app.windowState
  * Added support for localized nodes in config.xml
  * Fixed BB10's `webkitResolveLocalFileSystemURL` was using an undefined method
  * Fixed typos in the BB10 config spec that caused the `occurrence` attribute to be ignored
  * Fix build and deployment (UI) bug when target is not selected
  * Update BB10 Dev Alpha device with correct pixel ratio and added devicePixelRatio to the window object
  * Added a helpful error when registering for an unsupported (BB10) event
  * Fixed blackberry.app returning incorrect values

* Cordova
  * Fixed write file bug in File API
  * Fixed for supporting cordova 2.3 js files
  * Added support for online / offline event firing on network settings change
  * Fixed a bug that would throw an exception if you tried to trigger a platform event (without cordova.js in your project)
  * Added a custom message if user has not included their Cordova v2.x.x file in their project (when triggering platform events)
  * Added a cancel button when requesting Camera

* W3C (i.e. Cordova, WebWorks, Mobile Web)
  * Fixed `watchPosition` shouldn't invoke error when passed undefined options
  * Fixed `clearWatch` should not throw an exception if given invalid id

* CLI * New (https://github.com/blackberry/Ripple-UI#cli--npm-package)
  * CLI (and NPM package install)
  * Implemented a node based cross origin XMLHttpRequest proxy (that can be booted via the CLI)
  * Ability to use CLI to statically host your (web) app

## v0.9.10 - September 26, 2012
Incremental update to fix a release error for the http://developer.blackberry.com hosted version of Ripple

## v0.9.9 - September 25, 2012
pull request can be found here: https://github.com/blackberry/Ripple-UI/pull/563

* WebWorks BB10 support:
 * Added support for FileSystem API
 * Added support for rim:permissions config.xml validation
 * Update userAgent on BB10 Dev Alpha device
 * Added support for virtual keyboard events
 * Added new deployment target (device/simulator) for Build and Deploy Services

* Cordova updates:
 * Combined Cordova and PhoneGap platforms (under separate version)
 * Fixed platform version selection bug
 * Fixed FileWrite fail in Cordova 2.0.0
 * Added core W3C objects to cordova to properly support platforms that rely on those objects being there natively
 * Fixed default contacts not being modifiable
 * Inject BB10 WebWorks when loading the BB10 Dev Alpha device
 * Fixed clearWatch bug in geolocation API

* General updates:
 * Added support Geolocation routing using gpx files
 * Added support for (-webkit)-device-pixel-ratio for media query support
 * Fixed first-run check to display initial platform selection screen on first run
 * Fixed links not being underlined
 * Added the iPad 3 device
 * Split the iPhone 4/4S into its own device
 * Updated Chrome Extension to use Manifest V2
 * Fixed enableripple querystring to default to specified platform for Chrome Store version of Ripple
 * Fixed version number not showing up in About Ripple dialog
 * Updated config.xml missing/invalid message to be more descriptive

## v0.9.8 - Aug 15, 2012

* Introduced integrated Build & Deploy Services in RIM hosted Ripple
* Added ability to select Theme through querystring param for auto-enabling Ripple
* Minor UI clean up work
* Added Nexus 7 Device
* Added Galaxy Nexus Device

## v0.9.7 - July 19, 2012

* Fixed an issue with Ripple booting on Chrome 21 dev channel
* Webworks BB10 support: (https://github.com/blackberry/Ripple-UI/issues?milestone=11&page=1&state=closed)
 * blackberry.app.exit
 * device settings for software version and hardware ID
 * support for consumer and enterprise parameters
 * support for the swipe down event
 * support for invoke
* Fixed a caching issue.
* Cleaned up browser test failures
* updated build tooling to work in latest node
* updated README docs for running as a plugin
* added support for selecting the platform and version when launching from the querystring
* Updated Cordova support for 2.0.0 (https://github.com/blackberry/Ripple-UI/issues?milestone=13&page=1&state=closed)
 * updated the version numbers for phonegap and cordova
 * navigator camera
 * Media
 * File API
 * cordova specific event support
 * updated and fixed support for navigator.contacts
 * added partial support for navigator.device.capture

## v0.9.6.1 (HOTFIX) - June 21, 2012

* Fixed bug with Chrome Version 21.0.1180.0 dev where Ripple will not boot
* Added support for file:/// scheme in Chrome Store version (stil need to start Ripple with --allow-file-access-from-files flag)
* Fixed injection routine for cordova 1.6

## v0.9.6 (HOTFIX) - June 12, 2012

* Fixed bug which caused Ripple to not start up for some edge cases

## v0.9.5 - June 5, 2012

* Added whitelisting support for blackberry.event event registration
* Added support for window.orientation for WebWorks
* Updated blackberry.ui.dialog to async
* Added support for network connection type for WebWorks BB10
* Added support for connectionchange event for WebWorks BB10
* Added support for blackberry.device.version for WebWorks BB10

* Fixed touch events not being emulated due to race condition

* Known issue: no userAgent HTTP header support for the version distributed through the Chrome Web Store

## v0.9.4 - April 30, 2012 (not released to the Google Chrome Store)

* Added support for BlackBerry 10 WebWorks (beta)
* Added new BlackBerry 10 Dev Alpha device
* Added support for WebWorks Build and Deploy services
* Added userAgent emulation
* Added initial support for Cordova/PhoneGap 1.6 (alpha)
* (fix) Improved injection routine
* (known issue) Disabled loading in file:/// scheme

## v0.9.3 - March 10, 2012

* Added support for dynamic maps with OpenLayers
* Added missing properties to touch events
* Moved to Almond for module management
* (fix) [PhoneGap] events now fire on the correct DOM document
* (fix) [WW File] fixed the dateCreated and dateModified file properties
* (fix) [PhoneGap] fixed id bug on contacts API
* (fix) [iPhone] fixed viewport size to match screen size
* (fix) [iPhone] fixed screen size display
* (fix) [OpenLayers] fixed stylesheet link
* (fix) [touch] fixed element.ontouchX binding
* (fix) [touch] fixed event.screenX/Y values 
* (fix) [tests] fixed failing tests in browser runner
* (update) removed End of Life notice

## v0.9.2 - November 17, 2011

* Removed dependency on jasmine-node. Bumped jasmine submodule to v1.1.0.
* (fix) [utils] rippleLocation does not support specific ports (#237)
* (fix) [BB device] blackberry.io generates exceptions when specify "/" at the end of path (issue #235)
* (fix) [PB] all subfolders under shared folder do not exist (issue #230)
* (fix) [BB device] blackberry.io.file.readFile set wrong property in callback function (issue #229)
* (fix) [BB device] blackberry.io.dir.getParentDirectory generates exception (issue #228)
* (fix) [BB device] blackberry.io.dir.exists generates exceptions (issue #227)
* (fix) require('ripple/***') breaks in node 0.5.x/0.6.x (issue #226)
* (fix) [ripple/bootstrap] does not pass event object to listeners on window load/DOMContentLoaded (issue #217)
* (fix) [lib/deviceMotionEmulator] does not pass all arguments to window.addEventListener/removeEventListener (issue #216)
* (removed hotfix) window load event handlers are not triggered when navigating inside app (issue #190)

## v0.9.1 - November 11, 2011

* Added remote web inspector option for WebWorks and WebWorks TabletOS platforms, which is disabled by default.
* Listen for AppCache updateready events and reload accordingly.
* Bootstrap addEventListener hijacker dies if registered callback throws exception.
* Added a module (dbfs) to remove dependency on File API for blackberry.io.{dir|file} (for the time being).
* Added blackberry.io.dir.appDirs property for tablet and improved filesystem initialization to include directories expected for both tablet and handset.
* (Hotfix) window load event handlers are not triggered when navigating inside app container (i.e. inside iframe). See [Issue #190](https://github.com/blackberry/Ripple-UI/issues/190).

## v0.9.0 - October 18, 2011

* Added Omnibar plugin to web build
* Removed vodafone, opera, wac platforms
* Added agnostic filesystem api (thin wrapper for W3C File API)
* Added support for blackberry.io.file and blackberry.io.dir (including blackberry.utils.stringToBlog and blobtoString)
* Added APIs for blackberry.app.event.onSwipeDown and blackberry.app.event.onSwipeStart for WebWorks Tablet
* Added support for manually firing events in the PhoneGap Events API
* Added various BB device skins
* Add controls for BB build and deploy service
* Support clientX property in touch events
* Added cache.manifest support to web build
* (Fix) [WebWorks] bb.invoke.invoke launches undefined application for CameraArguments
* (Fix) [WebWorks] sms.isListeningForMessage should be settable
* (Fix) [WebWorks] bb.app issues
* (Fix) [WebWorks] bb.ui.menu issues
* (Fix) [PhoneGap] When successfully removing a contact, a list of contacts is incorrectly returned
* (Fix) [PhoneGap] When saving a contact, the returned list is incorrect
* (Fix) [WebWorks-TabletOS] bb.invoke Browser: URLs do not support certain protocols
* (Fix) [WebWorks-TabletOS] bb.system.hasPermission() generates exception
* (Fix) [WebWorks-TabletOS] - blackberry.ui.dialog.standard/customAskAsync settings parameter does not work
* (Fix) [WebWorks-TabletOS] - blackberry.ui.dialog missing some constant definitions
* (Fix) [WebWorks/WebWorks-TabletOS] Duplicate versions in platform version select dropdown
* (Fix) WebWorks-TabletOS platform initializes UI plugins that are specific to WebWorks
* (Fix) The Back Button on a Device Skin only works on WebWorks platforms
* (Fix) [WebWorks] blackberry.invoke.invoke generates exceptions
* (Fix) [WebWorks] blackberry.identity issues
* (Fix) [WebWorks] wrong attributes validation in config.xml for rim:transitionEffect
* (Fix) [PhoneGap] contacts.find can not return all contact fields when given "*" for fields param
* (Fix) [WebWorks] rim:navigation property is not displayed in the config panel
* (Fix) gamma value in accelerometer UI panel posts no useful information
* (Fix) [WebWorks] PhoneLogs.addPhoneLogListener does not return a Boolean
* (Fix) [WebWorks] When a call log record is added, onCallLogAdded is called with an empty object
* (Fix) [WebWorks] bb.audio does not keep consistence with the supported formats on a device
* (Fix) [WebWorks-TabletOS] invoke.APP_UPDATE should NOT exist on PlayBook
* (Fix) [WebWorks-TabletOS] system.setHomeScreenBackground should not exist
* (Fix) In the accelerometer panel, after rotating the device, then shaking the xAxis automatically resets back to 0
* (Fix) iFrame shows scroll bars when content overflows
* (Fix) SMS and Data text boxes too big
* (Fix) Can't switch to Nokia N97 (Touch) Device
* (Fix) Fixed fetching of config.xml relative to application content (on web build)

## v0.6.3 - October 7, 2011

* HOTFIX - Fixed load event not firing on navigation as well as bug with jQuery Mobile

## v0.6.1 - August 23, 2011

* jake build now places compiled folders in pkg/ (vs ../ripple_build)
* Tweaked bootstrap module to ensure APIs are properly injected when navigating within the iFrame
* Updated PhoneGap (visually) to 1.0
* Updated PhoneGap Contacts namespace (to navigator.contacts)
* Updated PhoneGap Connection API (and deprecated old network API)
* Fixed W3C Geolocation data values initially being 0
* Created a WebWorks-TabletOS platform, and split original WebWorks into webworks.tablet, webworks.handset and webworks.core
* Phone.addPhoneListener called with eventType of 0 (CB_CALL_INITIATED) did not assign the event (webworks.handset)
* Phone.addPhoneListener returns true when successfully assigned (webworks.handset)
* CallLog is exposed publicly (webworks.handset)
* Added WebWorks show and remove Banner APIs to webworks.handset
* Implemented SystemEvent APIs for webworks.tablet (i.e. Playbook)
* Fixed onHardwareKey and onCoverageChange events in SystemEvent API for webworks.handset
* Added the DeviceOrientation W3C APIs (to all platforms)
* Fixed webworks.core select module to handle -1 and null .max() values
* Added Invoke API to WebWorks-TabletOS
* Added .jshintignore file (and added node-jshint --show-non-error option to jake lint)

## v0.6.0 - August 02, 2011

* Fixed WebWorks pim.category to be in correct place (pim.category.XXX vs pim.XXX)
* Added missing accuracy property to PhoneGap (i.e. W3C) geolocation
* Removed vendor specific branding from Torch skin
* Fixed not being able to save any new Contacts in WebWorks
* Fixed Find in WebWorks
* Fixed a UI bug causing boolean based device settings to always return true
* Added W3C geolocation implementation to mobile web platform
* Added W3C geolocation implementation to WebWorks platform
* Fixed bug where you could not disable Ripple when auto-enabled

## v0.5.4 - June 27, 2011

* Added Bold 9900 to devices
* Added ability to bypass and better simulate CORS requests with the --disable-web-security flag (more info coming soon) 
* Fixed issues with running webworks on the file scheme
* Fixed generation of uids on blackberry.message.Message
* Fixed return value of blackberry.message.sms.removeReceiveListener
* Fixed blackberry.identity.phone.getLineIds
* Updated our error page to get rid of references to setting the delay (but not the zombies)
* updated our bootstrap/injection code to be closured better

## v0.5.3 - June 20, 2011

* Added Nexus S to devices
* Missing Storage UI panel in WAC
* Added additional apps to launch via invoke (Search, Memo, Java, Calendar, AddressBook)
* blackberry.app.id returns undefined
* blackberry.menu cannot set property 'isDefault' of undefined
* blackberry.app.setHomeScreenIcon doesn't return a bool
* blackberry.app.setHomeScreenName doesn't return a bool
* blackberry.invoke breakage (TaskArguments, PhoneArguments, MessageArguments)

## v0.5.2 - May 26, 2011

* Fixed (missed) breakages in a number of WebWorks apis

## v0.5.1 - May 24, 2011

 * Updated the device orientation UI to better support devices that don't support it.
 * Updated UI plugins so code is not executed if the plugin isn't available 
 * Updated Ripple to use UglifyJS to compress code 
 * Added a device default orientation (e.g. Playbook defaults to Landscape) 
 * Fixed Selected Platform showing as Mobile Web Vdefault type-o
 * Fixed Playbook image sprite
 * Fixed Playbook skin, landscape/portrait mismatch 
 * Fixed UI for handling of Webworks default menu item to be more clear as to which is the default item
 * Fixed Ripple :: Initialization Finished (Make it so.) being logged twice
 * Fixed bug where on first run the platform selection buttons were not clickable

## v0.5.0 - May 11, 2011

* Added support for the Webworks Platform
* Only Webworks APIs listed in the config.xml are available for the app (all are available if there is no config)
* Removed visual scrollbars for applications that scroll on body
* Added Device skinning support and added BlackBerry Skins (Torch, Bold, Playbook)
* Added functional back and menu buttons for (applicable) Blackberry devices (on WebWorks).
* Implement getAllResponseHeaders on jsonp XHR
* Mixin platform api methods into their respective objects if they already exist in window, instead of overwriting it (ex. window.navigator on PhoneGap)
* Use latest jWorkflow (0.4.0)
* Use latest jQuery (1.6) and jQuery UI (1.8.12)
* Renamed Webworks version from 1.0.0 to 2.0.0
* Refactor to use the CommonJS module pattern
* Added iPad to PhoneGap
* Fixed XHR to not do CORS if on the same domain
* Fixed handling of errors and when to show the error page
* Fixed selected platform showing as Mobile Web Vdefault
* Fixed Invalid data being put into Geolocation UI
* Fixed xml config parsing should parse features into appInfo
* Fixed unreadable (light) background on selected boxes in Chrome ~12
* Removed PPI Emulation
* Fixed Playbook user agent string
* Fixed scrollbars rendering incorrectly on Windows XP
* When ripple is updated it uses the HTML5 notifications API instead of popping up an annoying window

## v0.4.14 - April 21, 2011 (HOT FIX)

* HOTFIX: Fix bug where loading a Sencha Touch 1.1.0 application caused the emulation window to shift to the left.
* HOTFIX: Fix bug where XMLHttpRequest.getAllResponseHeaders() was throwing an "unimplemented" exception for jsonp calls.

## v0.4.13 - April 14, 2011 (HOT FIX)

* HOTFIX: Fix bug where loading a Sencha Touch 1.1.0 application caused the emulation window to shift to the left.
* Update the Ripple product Update page

## v0.4.12 - March 16, 2011 (HOT FIX)

* HOTFIX: Ensured that XHR proxy is not called for non-Cross Origin requests.

## v0.4.11 - March 05, 2011 (HOT FIX)

* Implemented workaround for NS Basic/App Studio that was causing Ripple to crash

## v0.4.10 - Feb 24, 2011 (HOT FIX)

* Fixed first run window bug, selected is now remembered when Ripple loads
* Fixed proxy redirection bug for XMLHTTPRequest, local URLs were being identified as external URLs
* Removed view port sizing for iPhone 3g for the PhoneGap platform

## v0.4.9 - Feb 16, 2011

* Split platform selection and device selection into two separate panels
* Fixed Accelerometer bug ( Gravity FAIL :-) )

## v0.4.8 - Feb 07, 2011

* Added support for:
    * PhoneGap Compass
    * PhoneGap.available property
    * Ability to auto-enable Ripple with "enableripple=true" querystring parameter

* Fixed Accelerometer bug ( Trigonometry FAIL :-) )
* Removed Storage UI panel for PhoneGap

## v0.4.7 - Jan 28, 2011

* Fixed Messaging.sendMessage validation bug (WAC)

## v0.4.6 - Jan 26, 2011

* Updated notification pane to position over the emulated mobile device
* Added support for the PhoneGap contacts API
* Fixed Audio and Video bugs
* Added UI element in Ripple to deal with Video Player

## v0.4.5 - Jan 14, 2011

* removed tinyhippos prefix from css rules
* added some more parameter validation to the WAC runtime in PIM, VideoPlayer, AudioPlayer, Camera
* Added PhoneGap config validation
* We now display the widget name, version and icon in the infopane on Phonegap based on the config.xml
* Added the ability to simulate a GPS timeout on WAC and Phonegap
* Disable ability to enable ripple on a directory listing in the file:/// scheme (security issues)
* Prevent ripple from injecting itself on non html files (img, js, css, etc)
* Support for touchstart, touchmove and touchend DOM events.

## v0.4.3 - Dec 22, 2010

* Improved bootup sequence (ripple would present a white screen on bootup)
* Added support for network.isReachable (PhoneGap)
* Fixed a bug with Widget.Messaging.createMessage (WAC)
* Fixed several minor bugs in Widget.PIM (WAC)
* Instantiable objects in WAC now work as expected with the "instanceof" operator
* Fixed bug in Widget.Multimedia.Camera.setWindow not working

## v0.4.2 - Dec 16, 2010

* can run without the need of a local webserver
    * Please run Chrome with the --allow-file-access-from-files command line option for this to work
    * You need to ensure that the "Allow Access to file URLS" option on the extension page for Ripple

* QuirksMode support for JIL 1.0/1.2 setPreferenceForKey is deprecated.
* Update Information pane and device information
* Add in a hardcoded set of Contacts (currently only available after the body.onload)
* Fix Message class to be constructable
* DeviceStateInfo.onScreenChangeDimensions should not be supported
* Add jQuery AOP reference to main license
* Fixed boolean device settings would always be enabled
* Widget.Multimedia.AudioPlayer issue: media file not played after play function call.
* Widget.Multimedia.AudioPlayer open method is now sync
* Fixes to get Ripple working in Chrome 8/9/10
* Widget.Messaging.createMessage doesn't return a message object
* Support instanceof on instance types in WAC

## v0.4.1 - Dec 6, 2010

* Support for new devices in on the mobile web platform:
    * Blackberry Playbook
    * Blackberry Torch
    * Blackberry Bold 97xx
    * Nokia N8

* Support for new devices on the phonegap platform
    * Blackberry Torch
    * Blackberry Bold 97xx
    * Nokia N8
    * Palm Pre 2

* Improved injection issues on some sites
* Fixed error where sites that did fast dom manipulation would corrupt ripple's UI
* First run window will no longer refresh multiple times
* Made ripple loading sequence look nicer
* Added support for geolocation delay to phonegap and vodafone
* Moved geolocation delay to the geo panel rather than in device settings
* Tooltip settings will now persist
* Ripple no longer needs to refresh when navigating links inside the application
* Fixed some issues with the back button looping when navigating inside the emulated application
* Fixed a bug where device settings default values would stay true even when unchecked
* Ripple can now be disabled from lower level directories when enabled from a top level directory
* fixed emulation of window.screen size properties in screen and window
* Improvements to the Device Information UI

## v0.4.0 - Nov 30, 2010

* Read our blog post about this release - http://tinyhippos.com/2010/11/30/ripple-0-4-0-released/">here</a>
* New emulation code
    * Support for Sencha Applications
    * Support for jqTouch
    * Improved support for jQuery Mobile
    * Faster bootup times
    * API Objects are now available for use at eval time

* Improved Accelerometer control
* Added Camera Support to Vodafone
* Renamed JIL to WAC
* Renamed Vodafone 360 to Vodafone
* Changed Phonegap version from 0.9.1 to 0.9
* Snapping of phone to the side of the browser when hiding the panels
* Support for emulation of new devices on the mobile web platform:
    * iPhone 4
    * Playbook
    * Nokia N8

* Bug Fixes:
    * Fixed race condition when enabling ripple.
    * Fixed cases where dynamically inserted css links were not handled by the emulator.
    * Style attribute on body tag is no longer removed.
    * Fixed handling of position fixed
    * Added a default background (white) for cases where the users markup doesn't have a background colour
    * Fixed bug where earlier versions of prototype would cause ripple to not load

## v0.3.8 - Nov 19, 2010

* Fixed bug where jQuery mobile alpha 2 wouldn't render

## v0.3.7 - Nov 15, 2010

* JIL: Widget.Multimedia.VideoPlayer support
* JIL: Widget.Messaging improved support
* JIL: Widget.Multimedia.Camera support
* Styling on html tag now fully emulated
* /virtual/widgethome now automatically mapped to the widgets url
* Fixed long standing issue with XHR CORs

## v0.3.6 - Oct 26, 2010

* Fixed Geolocation callback failure in DeviceStateInfo (JIL).

## v0.3.5 - Oct 22, 2010

* Improved JIL support
    * Messaging.createMessage
    * Messaging.sendMessage (partial)
    * PIM.CalendarItem
    * PIM.addCalendarItem
    * PIM.deleteCalendarItem
    * PIM.getCalendarItem
    * PIM.getCalendarItems
    * PIM.findCalendarItems
    * PIM.onCalendarItemsFound
* JIL/Vodafone now have Device Option for delay for onPositionRetrieved
* window.onload and body onload now handled properly
* window.onresize now fires properly
* window.innerHeight/Width now emulated properly
* Styling on body tag now fully emulated
* Added a PhoneGap demo widget. See it http://rippledemo.tinyhippos.com/phonegap/index.html
* Discovered issues in Ripple with prototype.js version 1.6.1 and earlier.
* Discovered bug: using fixed positioning in css may not result in desired layout in Ripple

## v0.3.4 - Oct 15, 2010

* Improved JIL support:
    * PIM.AddressBookItem
    * PIM.createAddressBookItem
    * PIM.findAddressBookItems
    * PIM.getAddressBookItem
    * PIM.getAddressBookItemsCount
    * PIM.onAddressBookItemsFound
    * PIM.addAddressBookItem
    * PIM.deleteAddressBookItem
* OMGWTFBBQ
* Mapping to Body tag now fully supported
* Fixed Language device setting select for UI for Vodafone 360

## v0.3.1 to v0.3.3 - Oct 7, 2010 - Bug fixes

* Ripple failing with 100% CPU usage on Mac OS X
* Ripple showing scrollbars on body
* Phonegap deviceready event should fire from document rather then window

## v0.3.0 - Oct 3, 2010

* Added support for PhoneGap
* Vodafone 360 separated from JIL into its own platform
* Additional JIL support for specific API support)
    * DeviceInfo.phoneOS
    * DeviceInfo.phoneModel
    * DeviceInfo.phoneManufacturer
    * DeviceInfo.phoneFirmware
    * DeviceInfo.phoneSoftware
    * DeviceStateInfo.language
    * Telephony.findCallRecords
    * Telephony.getCallRecord
    * Telephony.getCallRecordCnt
    * Telephony.initiateVoiceCall
    * Telephony.onCallRecordsFound
    * Telephony.onCallEvent

* Panel arrangements are now saved per platform instead of globally
* Implemented viewport sizing for various platforms and their devices
* Switched main persistence to SQLite
* Added platform select window when initially enabled for a specific URL
* Modified Platforms panel
    * Platform select is now platform only. Version select is now separate
    * Must now click "Change Platform" to trigger the change
* Accelerometer now has Shake feature (all platforms)
* Panel panes are collapsible
* Removed "Update" button from all panels (information is saved automatically)
* body id/class attributes get emulated properly

## V0.2.4 - August 17th, 2010

* Updated PPI emulation: all assets get sized correctly
* Added a generic phone wrapper to the emulated widget
* Optimized Ripple's loading time and package size for better performance
* Updated the UI panels to only display if they are relevant to the current platform being used
* Opera - fires "resolution" event when screen resolution/orientation changes
* JIL - Added support for:
    * DataNetworkConnectionTypes
    * DataNetworkInfo.isDataNetworkConnected
    * DataNetworkInfo.onNetworkConnectionChanged
    * DataNetworkInfo.getNetworkConnectionName
    * DataNetworkInfo.networkConnectionType
    * RadioInfo.isRadioEnabled
    * RadioInfo.isRoaming
    * RadioInfo.radioSignalSource
    * RadioInfo.radioSignalStrengthPercent
    * RadioInfo.onSignalSourceChange
    * PowerInfo.onLowBattery
    * PowerInfo.onChargeLevelChange
    * PowerInfo.onChargeStateChange
    * PowerInfo.isCharging
    * PowerInfo.percentRemaining
    * Config.setAsWallpaper
    * Config.setDefaultRingtone
    * Config.ringtoneVolume
    * Config.msgRingtoneVolume
    * Config.vibrationSetting
* BUG FIX: Changing platform will now refresh Ripple with the correct platform (no longer need to change the device to trigger the change)

## V0.2.2 to V0.2.3 - July 27th, 2010 - Bug Fixes

* Fixed table color not properly inheriting CSS defined color
* Opera bug Fixed a typo in configuration validation
* Fixed Background color not being set properly in the widget container
* JIL bug fixes (AccountInfo.userAccountBalance and DeviceInfo.phoneColorDepthDefault -> was a string not a numerical value)

## V0.2.1 - July 21th, 2010

* Small UI updates, including cleanup and some minor rearranging of the Platform panel
* Fixed 2 JIL platform bugs
    * DeviceInfo.totalMemory was a string updated to a number
    * DeviceStateInfo.availableMemory was a string updated to a number


## V0.2.0 - July 19th, 2010

* Added support for the following JIL APIs
    * Multimedia.getVolume
    * Multimedia.stopAll
    * Multimedia.isAudioPlaying
    * AudioPlayer.open
    * AudioPlayer.play
    * AudioPlayer.pause
    * AudioPlayer.resume
    * AudioPlayer.stop
    * AudioPlayer.onStateChange
    * Device.widgetEngineName
    * Device.widgetEngineProvider
    * Device.widgetEngineVersion
    * Device.vibrate
    * RadioInfo.isRadioEnabled
    * RadioInfo.isRoaming
    * DataNetworkInfo.isDataNetworkConnected
    * DeviceStateInfo.keypadLightOn
    * DeviceStateInfo.backLightOn
    * DeviceStateInfo.availableMemory
    * DeviceStateInfo.audioPath
    * DeviceStateInfo.processorUtilizationPercent
    * DeviceInfo.totalMemory
    * DeviceInfo.phoneColorDepthDefault
    * AccountInfo.phoneUserUniqueId
    * AccountInfo.phoneMSISDN
    * AccountInfo.phoneOperatorName
    * AccountInfo.userAccountBalance
    * AccountInfo.userSubscriptionType
    * Account.phoneName
    * Account.phoneId

* Update UI for themes to allow for better readability
* Implemented basic virtual file system
* Various paper-cuts and small bug fixes

## V0.1.186 - June 24th, 2010

* You can now do full cross domain XMLHttpRequests using both GET and POST methods as well as chose whether you want to make those requests synchronously or asynchronously
* We have added themes to Ripple... I won't tell you where they are, you'll have to go exploring a little.
* Updated the move and collapse controls for our panels. They should be more intuitive now
* Move our change log to our documentation site
* Updated the documentation site
* Updated the Welcome/Version update popup screen

## V0.1.158 - June 7th, 2010

* Bug fix: Persistence race condition, causing preferences to not save properly when widget first loaded.
* Added update and welcome popup notifications to inform user of automatic updates.
* Updated the Ripple logo.

## V0.1.137 - May 26th, 2010

* JIL 1.2.1 :: Added simple support for Widget.Device.DeviceStateInfo.AccelerometerInfo.
* JIL 1.2.1 :: Added support for config defined preferences.
* JIL 1.2.1 :: Added support for <strong>read-only</strong> config defined preferences.
* Preferences are now widget specific. Preferences saved in one widget will not show up in another.
* Minor CSS fixes for Notifications.

## V0.1.97 - May 17th, 2010

* Updated the way widget gets encapsulated and CSS styles applied. Should fix some widget display bugs.
* Fixed problem with JSON to ensure that internal version did not get overridden, but loaded widget.
* Fixed OpenURL for both JIL and Opera.
* Other small bug fixes.

## V0.1.6 - V0.1.44

* Fixed close button on error notifications to actually work.
* Added support for widget DOM injected content (for document.body), to ensure that the content gets inserted into the widget container as opposed to into the Body node.
* Added support for widget screen sizing based on available pixels (i.e. view port size) as opposed to device screen size.
* Added new devices to JIL 1.2.1 framework based on the list provided by Vodafone.
* Added warning if config.xml does not exist for a widget the requires it.
* Added warning if widget version does not match that of selected platform.
* Added support for screen.height, screen.availHeight (both the have the same value for now).
* Added support for screen.width, screen.availWidth  (both the have the same value for now).
* Will remember the state of the tool tips (on or off)
* Fixed zoom level on GPS map

## V0.1.6

* Added support for Widget.Device.DeviceStateInfo.onScreenChangeDimensions and Widget.onMaximize callback functions being
    called when device orientation is changed (i.e. going from Landscape to Portrait).
* Fixed a typo in link to demo widget 
* Added the What's New panel

## V0.1.3

* Updated PPI emulation to be optional, user must now select this feature.
* Updated Persistence "clear all" to not remove Ripple application state info. (bug fix) 

## V0.1.2

* Added Options page with information on each release as well as providing helpful information.
* Added link in the Ripple popup page to the Demo widget providing a step by step walk through the features available in Ripple

## V0.1.1

* Completed JIL API implementation. All unsupported methods will raise appropriate Exceptions. 

## V0.1.0

* Supports general web app development.
* Supports Opera and JIL (subset of API) mobile widget platforms.
* Widget.onWakeup
* Widget.onMaximize
* Widget.onFocus
* Widget.onRestore
* Widget.setPreferenceForKey
* Widget.preferenceForKey
* Widget.openUrl
* Widget.ExceptionTypes
* Widget.Exception
* Widget.Device.widgetEngineName =&gt; Static non-editable at this time
* Widget.Device.widgetEngineProvider =&gt; Static non-editable at this time
* Widget.Device.widgetEngineVersion =&gt; Static non-editable at this time
* Widget.Device.getAvailableApplications =&gt; Static non-editable at this time
* Widget.Device.launchApplication
* Widget.Device.AccountInfo.phoneUserUniqueId =&gt; Static non-editable at this time
* Widget.Device.AccountInfo.phoneMSISDN =&gt; Static non-editable at this time
* Widget.Device.AccountInfo.phoneOperatorName =&gt; Static non-editable at this time
* Widget.Device.AccountInfo.userAccountBalance =&gt; Static non-editable at this time
* Widget.Device.AccountInfo.userSubscriptionType =&gt; Static non-editable at this time
* Widget.Device.DeviceStateInfo.onPositionRetrieved
* Widget.Device.DeviceStateInfo.requestPositionInfo
* Widget.Device.PositionInfo
* Widget.Device.RadioInfo.RadioSignalSourceTypes
* Widget.Device.ApplicationTypes
