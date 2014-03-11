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

    cd path/to/plugin
    git log . # See what's changed since the previous release.
    vim README.md plugin.xml # Update release notes (bottom of README) and plugin version.
    git commit -am "Updated plugin release notes and version numbers for release."

* For each plugin found by: `plugman search org.chromium`:

    plugman publish path/to/plugin

## Update npm Dependencies

    # See what is stale
    npm outdated
    # Update them by:
    npm install foo@version --save

## Update Release Notes:

    vim RELEASENOTES.md
    :read !./dev-bin/release-logs.sh
    # Curate judiciously

Next, add in notable RELEASENOTE.md entries from `cordova-plugman` and `cordova-cli`.

## How to Publish a Release Candidate:

    git status
    # Things are good.
    vim package.json # and set version to "x.x.x-rc1"
    # Update shrinkwrap file:
    npm shrinkwrap
    git commit -am "Set version to x.x.x-rc1"
    dev-bin/prepfornpm.sh
    npm publish --tag=rc
    dev-bin/prepfornpm.sh # It's a toggle... yeah, i know...
    git push origin master
    # Double check that the previous command doesn't change the "latest" tag:
    npm info cca
    # If it did, set it back via:
    npm tag cca@### latest

## Publish full release:

    vim package.json # and remove -rc1 from version
    # Update shrinkwrap file:
    npm shrinkwrap
    git commit -am "Set version to x.x.x"
    git tag vx.x.x
    dev-bin/prepfornpm.sh
    npm publish
    dev-bin/prepfornpm.sh # It's a toggle... yeah, i know...
    git push origin master --tags
    # Unpublish rc
    npm tag cca@0.0.0 rc
    npm unpublish cca@x.x.x-rc1

2. Post to G+ page with version & release notes
3. Send an email to chromium-apps@ with version & release notes

