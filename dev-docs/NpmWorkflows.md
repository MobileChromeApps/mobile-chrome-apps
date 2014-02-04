# `npm` Workflows

## Create an Account / Sign into Existing Account:

    npm adduser

## How to Add an Owner:

    npm owner add username cca

## How to List Owners

    npm owner ls cca

## How to Update `npm`:

    npm update -g npm

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

    npm tag cca@0.0.4 latest # new version

## How to See What is Packaged:
    ./prepfornpm.sh
    npm pack
    ./prepfornpm.sh # It's a toggle... yeah, i know...
    tar xzf *.tgz
    cd package
    find .
