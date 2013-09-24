# chrome.identity Plugin

This plugin contains an API for doing OAuth2 authentication. On Android, it uses Google Play Services, and on iOS it uses InAppBrowser.

For how to use the API, refer to docs at: [http://developer.chrome.com/apps/app_identity.html](http://developer.chrome.com/apps/app_identity.html)

For iOS, you need to create a "web" entry in your [API Dashboard](https://code.google.com/apis/console/). Put this web `client_id` in your manifest (as shown below), and never the Android one (it is automatically extracted from your APK).

For Android, you need to create an "Android" entry in your [API Dashboard](https://code.google.com/apis/console/)

To find your debug signing certificate (password=android):

  keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore -list -v

On windows, replace `~` with `%USERPROFILE%`

When using this plugin outside the context of a Mobile Chrome App (app created with mca.js), you must provide OAuth settings via the `details` parameter of `getAuthToken`. For Example:

    chrome.identity.getAuthToken({
        oauth2: {
            client_id: 'YOUR_WEB_CLIENT_ID',
            scopes: [ 'ARRAY', 'OF', 'SCOPES' ]
        },
        interactive: true
    }, function(token) {
        ...
    });

Alternatively, you can install the org.chromium.runtime plugin and set the values in its manifest:

    var manifest = chrome.runtime.setManifest({
      oauth2: {
        client_id: 'YOUR_WEB_CLIENT_ID',
        scopes: [ 'ARRAY', 'OF', 'SCOPES' ]
      }
    });

## Playing with Google APIs
For an API Playground, and to find which scopes are needed for various APIs, use the [APIs Exploror](https://developers.google.com/apis-explorer/). Also consider using the [Google API JavaScript Client](https://code.google.com/p/google-api-javascript-client/) for an easier time.
