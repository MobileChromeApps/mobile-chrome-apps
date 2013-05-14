#!/bin/bash
# Copyright (c) 2013 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

set -e # Fail on errors

################################################################################
# Helpers
#
function GitCloneIfNotExists {
  if [[ ! -d "$(basename $1 .git)" ]]; then
    git clone "$1"
  fi
}

function RequireCommandLineTool {
  set +e
  FORCE=
  if [ $1 == '-f' ]; then
    FORCE=Y
    shift
  fi
  echo -n "Looking for $2... "
  target=`which $2`
  while [ -z "$target" -o ! -f "$target" ]; do
    echo
    read -p "Can't find $2. Enter the full pathname to continue: [ENTER to skip] " target
    if [ -z "$target" ]; then
      if [ "$FORCE" == "Y" ]; then
        echo "Please install $3 before continuing."
        exit 1
      else
        target=
        break
      fi
    fi
  done
  echo $target
  eval $1=$target
  set -e
}

################################################################################
# Script
#
echo "You are setting up Mobile Chrome Apps."
echo

echo "Checking dependencies..."
echo

OS=$(uname -s)

RequireCommandLineTool -f NPM_BIN npm "node.js"
RequireCommandLineTool -f JAKE_BIN jake "jake"
RequireCommandLineTool ANDROID_BIN android "the Android SDK"
if [ "$OS" == "Darwin" ]; then
  RequireCommandLineTool XCODE_BIN xcodebuild "XCode"
fi

if [ -z "$ANDROID_BIN" -a -z "$XCODE_BIN" ]; then
  echo "Unable to find either Android or iOS build environments. Aborting."
  exit 1
fi

read -p "Shall we continue? " -rn 1
if [ "$REPLY" != "Y" -a "$REPLY" != "y" ]; then
  echo
  exit 0
fi

set -x # Echo all commands

# create the right directory structure
mkdir -p cordova
mkdir -p mobile_chrome_apps

# clone cordova projects
cd cordova
GitCloneIfNotExists https://git-wip-us.apache.org/repos/asf/cordova-ios.git
GitCloneIfNotExists https://git-wip-us.apache.org/repos/asf/cordova-android.git
GitCloneIfNotExists https://git-wip-us.apache.org/repos/asf/cordova-js.git
GitCloneIfNotExists https://git-wip-us.apache.org/repos/asf/cordova-plugman.git
GitCloneIfNotExists https://git-wip-us.apache.org/repos/asf/cordova-cli.git
cd ..

# clone cordova projects
cd mobile_chrome_apps
GitCloneIfNotExists https://github.com/MobileChromeApps/chrome-cordova.git
cd ..

# build cordova-js
cd cordova/cordova-js
$JAKE_BIN
cd ../..

# install cordova-plugman, if it isn't already installed
type plugman >/dev/null 2>&1 || {
  cd cordova/cordova-plugman
  $NPM_BIN install
  sudo $NPM_BIN link
  cd ../..
}

# install cordova-cli, if it isn't already installed
type cordova >/dev/null 2>&1 || {
  cd cordova/cordova-cli
  git checkout future # TODO: remove once we merge back future branch
  $NPM_BIN install
  sudo $NPM_BIN link
  npm link plugman
  cd ../..
}

# make sure we are symlinking libs in cordova-cli
cd cordova/cordova-cli
if [ ! -h "lib/cordova-ios" -o ! -h "lib/cordova-android" ]; then
  rm -rf lib/cordova-*
  ln -s $PWD/../cordova-ios lib/
  ln -s $PWD/../cordova-android lib/
fi
cd ../..

# quick test
if ! type plugman >/dev/null 2>&1; then
  set +x
  echo "Plugman not installed."
  exit 1
fi
if ! type cordova >/dev/null 2>&1; then
  set +x
  echo "Cordova-cli not installed."
  exit 1
fi

set +x # No more echo

# rejoice
echo "Congratulations! You've successfully set up for Mobile Chrome Apps."
