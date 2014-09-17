## Step 2: Create a project

To create a default Chrome App for Mobile project in a directory named `YourApp`, run:

    cca create YourApp

Know what you're doing? You can also provide the App ID and the App Name from the command line:

    cca create YourApp com.your.company.YourApp "Your App"

If you have already built a Chrome App and wish to port it to a mobile platform, you can use the `--link-to` flag to create a _symlink_ to it:

    cca create YourApp --link-to=path/to/manifest.json

If you instead wish to _copy_ your existing Chrome App files, you can use the `--copy-from` flag:

    cca create YourApp --copy-from=path/to/manifest.json

Don't have your own Chrome App yet? Try one of the many [sample Chrome Apps with mobile support](https://github.com/GoogleChrome/chrome-app-samples#mobile-support).

_**Done? Continue to [Step 3: Develop &raquo;](Develop.md)**_
