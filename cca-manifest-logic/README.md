# cca-manifest-logic

Module contains logic from [cca](https://www.npmjs.org/package/cca) that is
shared with the [Chrome App Developer Tool](https://github.com/MobileChromeApps/chrome-app-developer-tool/).

## Using from cca

Nothing must be done when developing locally, but the version must be bumped
and published when publishing cca.

## Using from chrome-app-developer-tool

When developing changes, npm link cca-manifest-logic, install CADT and then run `gulp`
whenever files change. When happy with change, publish a new version to npm so that
chrome-app-deleloper-tool always works without needing to `npm link` in this module.

# Release Notes

# 1.1.1 (May 4, 2015)
* Add background-app to default plugin list

# 1.1.0 (May 4, 2015)
* Update plugin IDs of polyfills and google.payments plugins
* Remove obsolete plugin from defaults
* Use NPM plugin ids
* Allow setting "webview": "crosswalk@version"
* Remove mapping for obsolete syncFileSystem plugin
* Add chrome.usb plugin to manifest logic

# 1.0.0 (March 17, 2015)
* Added `createCspString` to `analyse-manifest`
* Generate `<icon>` within `config.xml` rather than copy files directly (fixes #404, fixes #403)
* Depend on `cordova-plugin-whitelist`
* Rename crosswalk engine plugin ID to not have "apache" in it
* Automatically install the bluetooth plugins
