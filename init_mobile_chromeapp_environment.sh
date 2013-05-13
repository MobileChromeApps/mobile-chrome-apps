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

################################################################################
# Script
#
echo "You are setting up Mobile Chrome Apps."

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
jake
cd ../..

# install cordova-plugman, if it isn't already installed
type plugman >/dev/null 2>&1 || {
  cd cordova/cordova-plugman
  npm install
  sudo npm link
  cd ../..
}

# install cordova-cli, if it isn't already installed
type cordova >/dev/null 2>&1 || {
  cd cordova/cordova-cli
  git checkout future # TODO: remove once we merge back future branch
  npm install
  sudo npm link
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
  echo "Plugman not installed."
  exit 1
fi
if ! type cordova >/dev/null 2>&1; then
  echo "Cordova-cli not installed."
  exit 1
fi

set +x # No more echo

# rejoice
echo "Congratulations! You've successfully set up for Mobile Chrome Apps."
