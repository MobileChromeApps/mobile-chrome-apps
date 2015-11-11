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
    dev-bin/create-tgz.sh
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

* See which have changes:

    cd ../mobile-chrome-apps-plugins
    ACTIVE=$(for l in *; do ( cd $l; LAST_VERSION_BUMP=$(git log --grep "Added -dev suffix" -n 1 --pretty=format:%h .); [[ -z $"$LAST_VERSION_BUMP" || -n $(git log -n 1 "$LAST_VERSION_BUMP"..master .) ]] && echo $l); done | xargs echo)
    # See what's changed so you have an idea:
    (for l in $ACTIVE; do (cd $l; echo $l; LAST_VERSION_BUMP=$(git log --grep "Added -dev suffix" -n 1 --pretty=format:%h .); git log --pretty=format:'* %s' --topo-order --no-merges "$LAST_VERSION_BUMP"..master -- . ; echo); done) | less

* Add release notes & bump version:

    for l in $ACTIVE; do ( cd $l; vim README.md plugin.xml package.json ); done

Vim helper command:
    :read !DATE=$(date "+\%h \%d, \%Y"); LAST_VERSION_BUMP=$(git log --grep "Added -dev suffix" -n 1 --pretty=format:\%h .); v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; echo "\#\# $v ($DATE)"; git log --pretty=format:'* \%s' --topo-order --no-merges "$LAST_VERSION_BUMP"..master .

    for l in $ACTIVE; do ( cd $l; git commit -am "Updated release notes and version for release" ); done
    for l in $ACTIVE; do ( cd $l; git push origin master ); done

* Tag repos

    for l in $ACTIVE; do ( cd $l; v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; git tag "$v"; echo "$PWD: Tagged $v"); done
    for l in $ACTIVE; do ( cd $l; pwd; v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; git push origin "refs/tags/$v"); done

* Publish plugins

    for l in $ACTIVE; do ( cd $l; npm publish ); done

* Set plugin versions to -dev

    for l in $ACTIVE; do ( cd $l; v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; v_no_dev="${v%-dev}"; if [ $v = $v_no_dev ]; then v2="$(echo $v|awk -F"." '{$NF+=1}{print $0RT}' OFS="." ORS="")-dev"; echo "$l: Setting version to $v2"; sed -i '' -E "s:version=\"$v\":version=\"$v2\":" plugin.xml; sed -i '' -E "s/\"version\": \"$v\"/\"version\": \"$v2\"/" package.json; fi); done
    for l in $ACTIVE; do ( cd $l; git commit -am "Added -dev suffix to plugin versions" ); done
    for l in $ACTIVE; do ( cd $l; git show ); done # Sanity check
    for l in $ACTIVE; do ( cd $l; git push origin master ); done

* Validate that plugins look good

    # TODO: This needs updating now that we're on NPM
    dev-bin/check-published-plugin.js ../mobile-chrome-apps-plugins/*

## Publish cca-manifest-logic Module (if changes exist)

Bump version

    cd cca-manifest-logic
    LAST_VERSION_BUMP=$(git log --grep "Set.*-dev" -n 1 --pretty=format:%h .); git log --pretty=format:'* %s' --topo-order --no-merges "$LAST_VERSION_BUMP"..master -- .
    vim README.md package.json ../package.json
    git add README.md package.json ../package.json
    git commit -m "Releasing cca-manifest-logic@$(grep '"version"' package.json | cut -d'"' -f4)"
    npm publish .

Increment & add -dev suffix

    vim package.json
    git add package.json && git commit -m "Set version of cca-manifest-logic to $(grep '"version"' package.json | cut -d'"' -f4)"
    git push origin master

Update version in chrome-app-developer-tool's package.json

    cd ../chrome-app-developer-tool
    npm install --save-dev cca-manifest-logic
    git add package.json && git commit -m "Updated cca-manifest-logic to v$(npm ls --depth=0 --parseable --long | grep cca-manifest-logic | cut -d: -f2 | cut -d@ -f2)"
    git push origin master


## Update npm Dependencies

First, make sure to unlink any local modules.  I like to just start with:

    rm -rf node_modules && npm install --production

See what is stale (newer versions available)

    npm outdated --depth=0
    # Update them by:
    npm install foo@version --save

## Update Release Notes:

    vim RELEASENOTES.md
    :read !./dev-bin/release-logs.sh VERSION
    # Curate judiciously

Next, add in notable RELEASENOTE.md entries from `cordova-plugman` and `cordova-cli`.

## How to Publish a Release Candidate:

    # Things are good?
    git status

    # set "version": "x.x.x-rc1"
    vim package.json

    # Update shrinkwrap dependancies
    npm shrinkwrap
    git add npm-shrinkwrap.json

    # Commit so that no-one re-uses this version of the rc
    git commit -am "Set version to $(grep '"version"' package.json | cut -d'"' -f4)"

    # Publish rc to npm
    dev-bin/create-tgz.sh
    npm publish *.tgz --tag=rc

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
* Test the update flow:
  * Just run `cca run android` from within a project and it should trigger
  * You can locally change the version in package.json (e.g. remove the -rc) to trigger it

## Publish full release:

    # Things are good?
    git status
    ls npm-shrinkwrap.json # Still exists from rc, right?

    # remove -rc# from "version"
    vim package.json
    CCA_VERSION="$(grep '"version"' package.json | cut -d'"' -f4)"
    git commit -am "Set version to $CCA_VERSION"
    git tag v$CCA_VERSION

    # Publish to npm
    dev-bin/create-tgz.sh
    npm publish *.tgz

    # Double check that the tags point to the right things:
    npm info cca

    # Unpublish rc
    npm dist-tag cca@0.0.0 rc
    npm unpublish cca@$CCA_VERSION-rc#

    # Remove shrinkwrap file, and push changed to master
    git rm npm-shrinkwrap.json
    vim package.json # Append -dev to "version", and bump the MINOR
    git commit -am "Set version to $(grep '"version"' package.json | cut -d'"' -f4) and removed shrinkwrap."

    git push origin master refs/tags/v$CCA_VERSION
    # If the push fails, do a git pull **WITHOUT --rebase**

2. Send an email to chromium-apps@chromium.org with version & release notes.
3. Post on G+ (using corp G+, but setting as public), then ask for it to be re-shared. ([example](https://plus.sandbox.google.com/+GoogleChromeDevelopers/posts/DiHAsUfetRo)).
    * **Tip:** Include an image or video with the post to increase engagement.
4. TODO: Is there merit in adding a "release" to our GitHub?

