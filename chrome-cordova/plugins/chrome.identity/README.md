# chrome.identity Plugin

This plugin provides OAuth2 authentication for Android and iOS.

On Android, this plugin uses Google Play Services; on iOS, it uses Google+.

## Status

Stable on Android and iOS.

## Reference

The API reference is [here](http://developer.chrome.com/apps/identity.html); a description of how to use the API is [here](http://developer.chrome.com/apps/app_identity.html).

### Mobile Reference

#### Added Functions

    chrome.identity.revokeAuthToken(object details, function callback)

Revokes the permissions associated with an OAuth2 access token and removes it from the cache.

* object `details`: Token information.
    * string `token`: The token to revoke.
* function `callback`: Called when the token has been revoked.
    * `callback` has no parameters.

#### Amended Functions

```
chrome.identity.getAccounts(function callback)
```

This function is only supported on Android.

* function `callback` has one parameter:
    * string `id`: In this implementation, this is the e-mail address associated with the account.

```
chrome.identity.getAuthToken(object details, function callback)
```

* object `details` recognizes an additional option:
    * string `accountHint`: The account to authenticate in the event that the account chooser dialog is to appear.
        * Specifying this prevents the account chooser dialog from appearing.
        * This only has an effect on Android.
* function `callback` has two parameters:
    * string `token`: The authentication token.
    * string `account`: The account associated with the token.

```
chrome.identity.getProfileUserInfo(function callback)
```

* function `callback` has one parameter:
    * string `email`: The e-mail address associated with the account.

## Preparing Your Application

### Android

You will need to register your application in the [Google Cloud Console](https://console.developers.google.com/).  Create a project.

On the left sidebar, navigate to "APIs & auth" > "Credentials".  Click the red `Create new Client ID` button.

Register your app as an "Android" app (under "Installed application" type).  This requires a package name and a SHA1 fingerprint.  To obtain the fingerprint, enter the following the command in a console window:

    keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore -list -v

(On Windows, replace `~` with `%USERPROFILE%`.)

You will be prompted for a password, which is `android`.

This process will yield a client id, but no action is required with it (unlike for iOS).

#### Identity Without Google Play Services

If Google Play Services is unavailable (for instance, using an emulator), this plugin uses a web authentication flow, which requires a web client id.

In the project created in the Google Cloud Console, create a new client ID.  The "Web application" type should be selected by default.  Empty the "Authorized JavaScript origins" text box, and in the "Authorized redirect URI" text box, remove the default and enter `https://YOUR_CHROME_APP_ID.chromiumapp.org/`.

Put the yielded client ID in your mobile manifest as described in the "Updating Your Manifest" section.

### iOS

For iOS, first follow **Step 1** of the instructions [here](https://developers.google.com/+/mobile/ios/getting-started#step_1_creating_the_apis_console_project).

**Note:** If you change your app's bundle identifier at any time, you will need to correspondingly update the bundle identifier in the following places:

* the [Google Cloud Console](https://cloud.google.com/console), under "APIs & Auth" > "Registered Apps", and
* your app's URL types in Xcode (located in the app's *Info* tab).

Next, follow **Step 4** on the same page ([here](https://developers.google.com/+/mobile/ios/getting-started#step_4_add_a_url_type)) to register a URL type.  If the URL type is already registered, you have no more to do for this step.

## Updating Your Manifest

Your manifest needs to be updated to include your client id and scopes. In a Chrome App, this is done in **manifest.json** as follows:

    "oauth2": {
      "client_id": "YOUR_CHROME_CLIENT_ID",
      "scopes": [
        "SCOPE_1",
        "SCOPE_2",
        "SCOPE_3"
      ]
    },

Additionally, for each other platform (including web, if you'd like to support Android authentication without Google Play Services), add a section to **manifest.mobile.json** containing the appropriate client ID.  For example:

    "android": {
      "oauth2": {
        "client_id": "YOUR_ANDROID_CLIENT_ID"
      }
    },
    "ios": {
      "oauth2": {
        "client_id": "YOUR_IOS_CLIENT_ID"
      }
    },
    "web": {
      "oauth2": {
        "client_id": "YOUR_WEB_CLIENT_ID"
      }
    }

This will clobber the client ID in **manifest.json** according to the platform.

**Note:** You do not need to specify your client ID for Android, but may want to for completeness. :)

When using this plugin outside the context of a Chrome App, this information must be provided using `chrome.runtime.setManifest`:

    chrome.runtime.setManifest({
      oauth2: {
        client_id: 'YOUR_IOS_CLIENT_ID',
        scopes: [ 'SCOPE_1', 'SCOPE_2', 'SCOPE_3' ]
      }
    });

## Playing With Google APIs

The [Google APIs Explorer](https://developers.google.com/apis-explorer/) is a useful tool for determining required scopes and testing various API use cases.

# Release Notes

## 1.3.1 (November 17, 2014)
- Added an unsupported result for iOS getAccounts
- Added getAccounts on Android

## 1.3.0 (October 21, 2014)
- Added `chrome.identity.getProfileUserInfo` API.
- Documentation updates.

## 1.2.3 (September 24, 2014)
- Replaced a deprecated method call.
- Added cached token refreshing.

## 1.2.2 (August 20, 2014)
- Fixed swizzling linker error
- Added a prompt to update Google Play Services

## 1.2.1 (May 8, 2014)
- Documentation updates.
- Fixed Android web authentication.
- Added account to iOS authentication (was already previously added for Android).

## 1.2.0 (April 1, 2014)
- Documentation updates.
- Added `accountHint` to `chrome.identity.getAuthToken`.
- Added the logged-in account to the callback of `chrome.identity.getAuthToken`.

## 1.1.0 (March 10, 2014)
- Documentation updates.
- Android: Use of the web auth flow when Play Services is unavailable
- Added `chrome.identity.getRedirectURL()`
- Fixes to launchWebAuthFlow()

