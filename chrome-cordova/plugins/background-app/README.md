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

`AndroidManifest.xml` Should look like:

```
       <activity
            android:allowTaskReparenting="true"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale"
            android:label="@string/activity_name"
            android:launchMode="singleTop"
            android:name="MainActivity"
            android:theme="@android:style/Theme.Black.NoTitleBar"
            android:windowSoftInputMode="adjustResize">
        </activity>
        <activity
            android:name="org.chromium.BackgroundAppMainActivity"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale"
            android:theme="@android:style/Theme.Black.NoTitleBar">
            <intent-filter android:label="@string/launcher_name">
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        <activity android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale"
            android:excludeFromRecents="true"
            android:launchMode="singleTop"
            android:taskAffinity=".cordovabackground"
            android:name="org.chromium.BackgroundActivity"
            android:theme="@android:style/Theme.NoDisplay">
        </activity>
```

## Implementation Details

The goal is ultimately to be able to run the app in an Android service, but
because many plugins utilize CordovaInterface.getActivity(), a background Activity
rather than a Service is more viable.

## Known Issues

- When the app goes from not running -> running in background, if you are currently in the
  task switcher, the task switcher will close.

# Release Notes

