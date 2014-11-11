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

