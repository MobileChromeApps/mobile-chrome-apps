# `npm` Workflows

## Create an Account / Sign into Existing Account:

    npm adduser

## How to Add an Owner:

    npm owner add username cca

## How to List Owners

    npm owner ls cca

## How to Update `npm`:

    npm update -g npm

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

## Update Release Notes:

    vim RELEASENOTES.md
    :read !./dev-bin/release-logs.sh

Now curate the list.

## How to Publish a Release Candidate:

    git pull
    git submodule update
    git status
    # Things are good.
    npm version 0.0.4 # new version
    ./prepfornpm.sh
    npm publish --tag=rc
    ./prepfornpm.sh # It's a toggle... yeah, i know...
    git push origin master --tags
    # Double check that the previous command doesn't change the "latest" tag:
    npm info cca
    # If it did, set it back via:
    npm tag cca@### latest

## Promote to Full Release:

1. Tag it:

    npm tag cca@0.0.4 latest # new version

2. Post to G+ page with version & release notes
3. Send an email to chromium-apps@ with version & release notes

## How to See What is Packaged:
    ./prepfornpm.sh
    npm pack
    ./prepfornpm.sh # It's a toggle... yeah, i know...
    tar xzf *.tgz
    cd package
    find .
