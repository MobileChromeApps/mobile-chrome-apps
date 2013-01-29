# Chrome APIs

This document describes the structure and use of the Chrome Javascript API. See [MODULES.md](https://github.com/MobileChromeApps/chrome-cordova/blob/master/api/MODULES.md) for a description of the module system.

Most of the API lives in `chrome/`, in subdirectories and files named according to the `chrome.*` namespace. Refer to ../README.md for build instructions.

### Linting

Grunt uses JSHint to lint our files (with the exceptions of `prefix.js` and `suffix.js`, which are incomplete files it can't parse prior to concatenation). My settings for JSHint (see `grunt.js` for details) are fairly strict, though I had to include a couple of the slackening options to cover the hacky nature of our Chrome shim. In particular I had to set `evil: true`, which allows `eval()` and `document.write`. It also whined about spaces after `if` and `for` and some other places, so I disabled its whitespace rules so we can use Google style.

In a similar vein, it will enforce 2 spaces for indentation with no tabs. Unused parameters, duplicate definitions, variable shadowing, no-one-line-blocks and other useful checks are all enabled. If you spot something it should be catching but isn't, let me know; JSHint has dozens of options to configure that behavior.

JSHint also disallows global variables in general. The `browser` option allows `alert`, `console`, `document` and so on, but any new global variables (say things defined in `prefix.js`) can be added to the `globals` array in `grunt.js`. The boolean value accompanying these is `true` if code is allowed to overwrite said global variable (usually we want `false`, then).

The linter errors are compile-blocking errors by default, rather than warnings, and I think we should keep it that way.
