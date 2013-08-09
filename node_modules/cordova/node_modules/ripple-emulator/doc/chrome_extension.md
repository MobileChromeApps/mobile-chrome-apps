# Using Ripple As A Chrome Extension

One of the (main) build targets for Ripple is a Chrome (browser) extension.

Using the extension is pretty straightforward. There are many ways to get it, but this will focus on building it and loading it as an unpacked extension.

## Building The Chrome Extension Target

To build:

    jake build
    ls -l pkg/chrome.extension

Here you will see all the top level files/folders of the built extension.

Once you have done that, to install it, you need to:

* Go to the extension management page (chrome://chrome/extensions/) in chrome.
* Ensure that you have selected the developer mode checkbox.
* Click the Load Unpacked extension button.
* Select the `pkg/chrome.extension` folder.

NOTE: For development you should be fine to just build with jake and refresh your browser.
If you end up editing anything in the ext folder you will need to refresh the extension from the extension management page.

## Enabling On A Web Application

There are two ways to host your application and emulate it with the Chrome extension.

The main way is to host your application on a local (or remote) http server, and enable Ripple on that page.

You can enable Ripple on the current URL by:

* Right clicking on the page and using the "Emulator" context menu, or..
* Use the Ripple pop up menu (icon) in the Chrome toolbar (i.e. where all other extensions have icons).

## Enabling On The File Scheme

You can also emulate an application without an http server (via `file:///`).

However, this is not recommended, as there are various issues and idiosyncrasies with such a method, mostly that do not reflect the environment in which an application is served up over http.

If you still wish to do so, you will need to do a few things.

* You will (most likely) need to run Chrome with this command line flag:

    `--allow-file-access-from-files`

Also, in addition to the flag you may need to:

* Open the Extensions tab
* Locate Ripple in the list, and check off the "Allow access to file URLs" checkbox
