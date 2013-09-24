# chrome.syncFileSystem Plugin

Refer to docs at: [https://developer.chrome.com/apps/syncFileSystem.html](https://developer.chrome.com/apps/syncFileSystem.html)

Status: alpha

When using this plugin outside the context of a Mobile Chrome App (app created with mca.js), you must provide an App ID and OAuth settings via chrome.runtime. For example:

    var manifest = chrome.runtime.getManifest();
    manifest.oauth2 = {
        client_id: 'YOUR_CLIENT_ID',
        scopes: [ 'ARRAY', 'OF', 'SCOPES' ]
    };
    manifest.id = 'my.app.id';
