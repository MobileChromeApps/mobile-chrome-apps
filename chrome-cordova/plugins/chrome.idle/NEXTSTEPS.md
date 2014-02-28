According to the [Chrome documentation](http://developer.chrome.com/extensions/idle.html), this API should detect when the *machine's* idle state changes.  As currently implemented, the plugin uses touch events in JavaScript to determine idle time.  As a result, only user interaction within the app itself counts towards resetting the idle timer.

Implementing full device idle detection doesn't appear to be possible.  However, we should change the current implementation in two ways:

1. Use native interaction detection instead of JS touch events.
2. Trigger idle immediately when the app is moved to the background.

Also, triggering of the "locked" state still needs to be implemented.
