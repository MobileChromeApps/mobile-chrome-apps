# chrome.identity Plugin

This plugin contains an API for doing OAuth2 authentication. On Android, it uses Google Play Services, and on iOS it uses InAppBrowser.

Refer to docs at: [http://developer.chrome.com/apps/app_identity.html](http://developer.chrome.com/apps/app_identity.html)

When using this plugin outside the context of a Mobile Chrome App (app created with mca.js), you must provide OAuth settings via the `details` parameter of `getAuthToken`. For Example:

    chrome.identity.getAuthToken({
        oauth2: {
            client_id: 'YOUR_CLIENT_ID',
            scopes: [ 'ARRAY', 'OF', 'SCOPES' ]
        },
        interactive: true
    }, function(token) {
        ...
    });

Alternatively, you can install the org.chromium.runtime plugin and set the values in its manifest:

    var manifest = chrome.runtime.getManifest();
    manifest.oauth2 = {
        client_id: 'YOUR_CLIENT_ID',
        scopes: [ 'ARRAY', 'OF', 'SCOPES' ]
    };
