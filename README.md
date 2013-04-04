# Chrome Apps for Mobile

APIs, integration shim and tests for running Chrome Packaged Apps V2 on mobile using Apache Cordova.

These tools are at a very early alpha stage.

## Components

* APIs live under `plugins/`.
    * Some APIs (socket, storage, etc.) have standalone plugins and are optional. They can be used with just `plugins/common`, `plugins/bootstrap` is not necessary if the app is not a Chrome app.
    * `plugins/common` contains generic things like `chrome.Event` that are used everywhere.
    * `plugins/bootstrap` contains the main Chrome `runtime` and `window` APIs, and the HTML wrapper `chromeapp.html` used to bootstrap a Chrome app on Cordova.
* Chrome-spec test suite is in `spec/`.
* Example Chrome app files like `manifest.json` are in `templates/`.

## Getting Going

Step 1: Configure the `cordova` commmand.

    git clone https://git-wip-us.apache.org/repos/asf/cordova-plugman.git
    cd cordova-plugman
    git checkout future
    npm install
    sudo npm link
    cd ..
    git clone https://git-wip-us.apache.org/repos/asf/cordova-cli.git
    cd cordova-cli
    git checkout future
    npm install
    sudo npm link
    npm link plugman

Step 2: Create a project using the `create_chromeapp.sh` script.

    $ ./chrome-cordova/create_chromeapp.sh MyProject
    Install all plugins without prompt? [y/n] y
    Symlink all your plugins? [y/n] n
    Also add chrome spec? [y/n] n

Step 3: If you didn't answer Y to "Also add chrome spec", then put your Chrome-app code into your newly created www/ directory.

## Building & Running

TODO
