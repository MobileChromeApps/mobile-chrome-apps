# `npm` Workflows

## Create an Account / Sign into Existing Account:

    npm adduser

## How to Add an Owner:

    npm owner add username cca

## How to List Owners

    npm owner ls cca

## How to Update `npm`:

    npm update -g npm

## How to Update Release Notes:

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
    git push
    git push --tags

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
