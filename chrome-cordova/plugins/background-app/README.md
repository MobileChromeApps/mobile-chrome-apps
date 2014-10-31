# Start an App Without Showing the Activity

The purpose of this plugin is to enable notifications, alarms, etc to
re-start your app and fire callbacks without the app causing any visual
cues to the user.

## Status

Currently works on Android only.

## Usage

There is no user-facing APIs for this plugin. Instead, it is meant to be
used from native code by other Cordova plugins. See `org.chromium.notifications`
and `org.chromium.alarms` for examples.

*Manual install step!*

You need to modify your Activity.java and change:

    public class MainActivity extends CordovaActivity

to:

    public class MainActivity extends org.chromium.BackgroundAppMainActivity // extends CordovaActivity

Note that the comment is actually required by the command-line tools.

## Implementation Details

The goal is ultimately to be able to run the app in an Android service, but
because many plugins utilize CordovaInterface.getActivity(), a background Activity
rather than a Service is more viable.

So far, the only caveat is that plugins that use `cordova.getActivity().registerReceiver()`
will stop working once the app switches from background -> foreground. To work-around
this, plugins should use `webView.getContext().registerReceiver()` instead.


# Release Notes

