# `npm` Workflows

## Create an Account / Sign into Existing Account:

    npm adduser

## How to Add an Owner:

    npm owner add username cca

## How to List Owners

    npm owner ls cca

## How to Update `npm`:

    npm update -g npm

## How to See What is Packaged:
    dev-bin/prepfornpm.sh
    npm pack
    dev-bin/prepfornpm.sh # It's a toggle... yeah, i know...
    tar xzf *.tgz
    cd package
    find .

# Cutting a Release

## Update submodules

    # Pull updates:
    git submodule foreach "git fetch origin"
    # Update what they point to:
    ( cd cordova/cordova-android && git checkout TAG_OR_BRANCH )
    git commit -am "Updated cordova-android submodule to FOO"

## Publish Plugin Changes

* For each plugin within chrome-cordova/plugins:

        git log path/to/plugin # See what's changed since the previous release.
        cd path/to/plugin
        vim README.md plugin.xml # Update release notes (bottom of README) and plugin version.
        git commit -am "Updated plugin release notes and version numbers for release."

* For each plugin found by: `plugman search org.chromium`:

        plugman publish path/to/plugin

    **Note:** You may need to search [the registry website](plugins.cordova.io).

## Update npm Dependencies

First, make sure to unlink any local modules.  I like to just start with:

    rm -rf node_modules && npm install

See what is stale (newer versions available)

    npm outdated --depth=0
    # Update them by:
    npm install foo@version --save

## Update Release Notes:

    vim RELEASENOTES.md
    :read !./dev-bin/release-logs.sh
    # Curate judiciously

Next, add in notable RELEASENOTE.md entries from `cordova-plugman` and `cordova-cli`.

## How to Publish a Release Candidate:

    # Things are good?
    git status

    # set "version": "x.x.x-rc#"
    vim package.json

    # Update shrinkwrap dependancies
    npm shrinkwrap
    git add npm-shrinkwrap.json

    # Commit so that no-one re-uses this version of the rc
    git commit -am "Set version to x.x.x-rc#."

    # Publish rc to npm
    dev-bin/prepfornpm.sh
    npm publish --tag=rc
    dev-bin/prepfornpm.sh # It's a toggle... yeah, i know...

    # Double check things are still good
    git status
    git push origin master

    # Double check that the tags point to the right things:
    npm info cca

If anything goes wrong, unpublish rc with:

    npm tag cca@0.0.0 rc
    npm unpublish cca@x.x.x-rc#

## How to Test Release Candidate:

The following is the full set of tests. Vary accordingly depending on the magnitude of changes in the release.

* Install cca RC from npm: `npm install cca@rc`
* Ensure [CIRC](https://github.com/flackr/circ.git) works:
  * Note: `chrome.sockets` is now required for circ.  Until we implement it, checkout `7a262a7`.
  * On iOS
  * On Android
  * Joining a room:
    * `/nick tester`
    * `/server chat.freenode.net`
    * `/join #cordova`
  * Check that killing & re-running the app auto-joins
* Ensure that ChromeSpec passes all tests on iOS & Android
* Ensure that ChromeSpec on Android can be run from Windows host (via VirtualBox + modern.ie is easiest).

## Publish full release:

    # Things are good?
    git status

    # remove -rc# from "version"
    vim package.json
    git commit -am "Set version to x.x.x."
    git tag vx.x.x

    # Publish to npm
    # Confirm "publishConfig": { "tag": "rc" } is not set in package.json
    dev-bin/prepfornpm.sh
    npm publish
    dev-bin/prepfornpm.sh # It's a toggle... yeah, i know...

    # Double check that the tags point to the right things:
    npm info cca

    # Unpublish rc
    npm tag cca@0.0.0 rc
    npm unpublish cca@x.x.x-rc#

    # Remove shrinkwrap file, and push changed to master
    git rm npm-shrinkwrap.json
    git commit -m "Removing shrinkwrap file after release"

    # Append -dev to "version", and bump the MINOR
    vim package.json
    git commit -am "Set version to x.x.x-dev."

    git push origin master --tags

2. Send an email to chromium-apps@chromium.org with version & release notes.
3. Post on G+ (using corp G+, but setting as public), then ask for it to be re-shared. ([example](https://plus.sandbox.google.com/+GoogleChromeDevelopers/posts/DiHAsUfetRo)).
    * **Tip:** Include an image or video with the post to increase engagement.
4. TODO: Is there merit in adding a "release" to our GitHub?

