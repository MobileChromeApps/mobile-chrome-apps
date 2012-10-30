# Module System

I opted to use a custom module loader based on the CommonJS pattern (similar to that used in nodejs and others).

## How to use it

Each module is wrapped with the following code:

    __modules['chrome.some.api'] = function(require, modules, chrome) {
    };

This enables modules to use the `require()` function themselves to require their dependencies. They also get passed the `chrome` object, which right now is an alias to `window.chrome` but in future we might need to do something more complicated.

The third argument, `module`, is an object containing a single property, `module.exports`.
This indirection is useful because then the module can completely change `module.exports`, rather than just its properties.
Occasionally it is useful to have a modules value be a function instead of an object.
The return value of `require('some.module')` is the value of `module.exports`, whatever type it may be.

Most of the `chrome` APIs, since they do their work with the "global" object `chrome`, won't set anything interesting for `module.exports`.
However it is useful for helpers and utilities.
For example, several event handling APIs do

    var events = require('helpers.events');
    chrome.some.api.someEvent.addListener = events.addListener('someEvent');


## Under the hood

The gruntfile includes `prefix.js` first, then all `chrome/**/*.js`, then `chrome.js` where the main `require()`s are done, then `suffix.js`.
You should't have to look at `prefix.js` or `suffix.js`, but we both know you're going to look anyway.
`prefix.js` defines `var __modules = {};` which is where the modules live.
`suffix.js` defines `require()` and calls `require('chrome');` to kick things off.
The initial value of `__modules['chrome.some.api']` is the module function described above.
Once it has been loaded once, however, the value is set to its `module.exports` (which may or may not be empty).
Future `require('chrome.some.api')` calls simply return the cached `module.exports`.
This means that modules are singletons and multiple `require()`s carry almost no overhead.


## What are you, crazy?

Probably, but that doesn't necessarily say anything about this design.

I'm not thrilled with rolling my own here, but RequireJS and CommonJS expect to be loading the files themselves using various APIs (CommonJS using their file access APIs a la Node.js, RequireJS using `<script>` tags) rather than having everything included in the same file as we're doing.

This design meets all the requirements I came up with:

* Modules exist in multiple files concatenated with Grunt, order of their inclusion doesn't matter.
* File names and paths are not significant, only module names. There is no search path, which would be confusing once pulled into a single file.
* Required modules are singletons, so there's no worry of duplicating effort by requiring the same module more than once in different places.
* Order of module loading is automatically determined, so long as modules require their dependencies.
* Allow indirection of the `chrome` object so that it doesn't make any assumptions about `window` or other global state.
* Nothing leaks into the global scope unless we want it to. The whole ordeal is wrapped in `(function() { ... })();`, so the only effect on global state should be the explicitly set `window.chrome`.

Comments, critique and improvements welcome.

