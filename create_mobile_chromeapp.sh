#!/bin/bash
# Copyright (c) 2013 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

set -e # Fail on errors

################################################################################
# Helpers
#
function AddPlugin {
  echo cordova plugin add "$1"
  cordova plugin add "$1"
}

function FailIfNotExists {
  if [[ ! -d "$1" ]]; then
    echo -n "Expected path does not exist: $1"
    exit 1
  fi
}

function FindCommandLineTool {
  set +e
  echo -n "Looking for $2... "
  target=`which $2`
  while [ -z "$target" -o ! -f "$target" ]; do
    echo
    read -p "Can't find $2. Enter the full pathname to continue: [ENTER to skip] " target
    if [ -z "$target" ]; then
      target=
      break
    fi
  done
  echo $target
  eval $1=$target
  set -e
}

################################################################################
# Set default paths
# This script expects to be run from any subdirectory of `mobile_chrome_apps` folder, and expects your local directory structure to be as such:
#
# - (any dir)
#  - cordova
#    - cordova-ios
#    - cordova-android
#    - ...
#  - mobile_chrome_apps
#    - chrome-cordova
#    - experimental
#    - ...
#
MCA_DIR_NAME="mobile_chrome_apps"

MCA_PATH_FROM_ARGS="$(cd $(dirname $0); cd ..; pwd)"
MCA_PATH="${MCA_PATH:-$MCA_PATH_FROM_ARGS}"
CORDOVA_PATH="${CORDOVA_PATH:-$MCA_PATH/../cordova}"

set +e
XCODE_BIN=$(which xcodebuild)
HAS_XCODE=${XCODE_BIN:+Y}
ANDROID_BIN=$(which android)
HAS_ANDROID=${ANDROID_BIN:+Y}
set -e

for x in cordova-js cordova-ios cordova-android; do
  FailIfNotExists "$CORDOVA_PATH/$x"
done
FailIfNotExists "$MCA_PATH/chrome-cordova"

# Fail if these aren't installed
if ! type plugman >/dev/null 2>&1; then
  echo "Plugman not installed."
  exit 1
fi
if ! type cordova >/dev/null 2>&1; then
  echo "Cordova-cli not installed."
  exit 1
fi

if [ -n "$1" ]; then
  TARGET="$1"
else
  TARGET="ChromeSpec"
fi

################################################################################
# Script inputs
#
read -n 1 -p "Install all plugins without prompt? [y/n] " SHOULD_NOT_PROMPT
echo
echo "Starting..."
echo

################################################################################
# Create the project
#
set -x # Echo all commands

cordova create "$TARGET" com.google.cordova."$TARGET" "$TARGET"
cd "$TARGET"

if [ -n "$HAS_ANDROID" ]; then
  cordova platform add android
fi

if [ -n "$HAS_XCODE" ]; then
  cordova platform add ios
fi

set +x # No more echo

################################################################################
# Install plugins
#
for PLUGIN_PATH in "$MCA_PATH/chrome-cordova/plugins/"*; do
  if [[ ! -d "$PLUGIN_PATH" ]]; then
    echo "Invalid plugin path: $PLUGIN_PATH"
    exit 1
  fi
  if [ "$SHOULD_NOT_PROMPT" != "y" ]; then
    read -n 1 -p "shall I add plugin: '$(basename $PLUGIN_PATH)'? [y/n] " SHOULD_INSTALL
    echo
    if [ "$SHOULD_INSTALL" != "y" ]; then
      continue;
    fi
  fi

  AddPlugin "$PLUGIN_PATH"
done

################################################################################
# Massage the workspace
#
set -x # Echo all commands

cordova prepare
rm -rf app/www/spec app/www/spec.html app/www/js app/www/index.html app/www/css app/www/img
if [ -n "$HAS_XCODE" ]; then
  rm -rf platforms/ios/CordovaLib
  "$CORDOVA_PATH/cordova-ios/bin/update_cordova_subproject" "platforms/ios/${TARGET}.xcodeproj"
fi

set +x # No more echo

################################################################################
# Report results
#
echo
echo "Successfully created $TARGET!"
echo
echo "cd $TARGET"
echo "open platforms/ios/${TARGET}.xcodeproj"
