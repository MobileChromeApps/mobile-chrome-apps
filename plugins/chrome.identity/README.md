# chrome.identity Plugin

OAuth2 authentication for Android and iOS. On Android, it uses Google Play Services, and on iOS it uses InAppBrowser.

Status: Stable on Android, alpha on iOS

For how to use the API, refer to docs at: [http://developer.chrome.com/apps/app_identity.html](http://developer.chrome.com/apps/app_identity.html)

For iOS, you need to create a "web" entry in your [API Dashboard](https://code.google.com/apis/console/). Put this web `client_id` in your manifest (as shown below), and never the Android one (it is automatically extracted from your APK).

For Android, you need to create an "Android" Client ID in your [API Dashboard](https://code.google.com/apis/console/)

To find your debug signing certificate (password=android):

    keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore -list -v

On Windows, replace `~` with `%USERPROFILE%`

When using this plugin outside the context of a Mobile Chrome App (app created with mca.js), you must provide OAuth settings via `chrome.runtime.setManifest`. For Example:

    chrome.runtime.setManifest({
      oauth2: {
        client_id: 'YOUR_WEB_CLIENT_ID',
        scopes: [ 'ARRAY', 'OF', 'SCOPES' ]
      }
    });
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
      if (!token) {
        console.log(JSON.stringify(chrome.runtime.lastError));
      }
    });


## Playing with Google APIs
For an API Playground, and to find which scopes are needed for various APIs, use the [APIs Exploror](https://developers.google.com/apis-explorer/). Also consider using the [Google API JavaScript Client](https://code.google.com/p/google-api-javascript-client/) for an easier time.
