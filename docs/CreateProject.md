## Step 2: Create a project

You can create a new mobile Chrome App project (named `YourApp`) by running the following command:

    cca create YourApp

If you have already built a Chrome App and you are ready to port it to a mobile platform, you can import an existing Chrome App. The `--link-to` flag will create a _symlink_ to your existing Chrome App directory:

    cca create YourApp --link-to=path/to/manifest.json

If you wish to _copy_ your existing Chrome App files to the newly created project folder, use the `--copy-from` flag instead:

    cca create YourApp --copy-from=path/to/manifest.json

Don't have your own Chrome App yet? Download one of the many [sample Chrome Apps](https://github.com/GoogleChrome/chrome-app-samples#mobile-support) with mobile support for a trial conversion.

_**Done? Continue to [Step 3: Develop &raquo;](Develop.md)**_
