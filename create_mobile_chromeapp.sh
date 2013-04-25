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

  if [ "$SHOULD_LINK" = "y" ]; then
    PLUGIN_TARGET_PATH="plugins/$(basename $1)"
    rm -rf "$PLUGIN_TARGET_PATH"
    ln -s "$1" "$PLUGIN_TARGET_PATH"
  fi
}

function FailIfNotExists {
  if [[ ! -d "$1" ]]; then
    echo -n "Expected path does not exist: $1"
    exit 1
  fi
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
CORDOVA_DIR_NAME="cordova"
MCA_DIR_NAME="mobile_chrome_apps"

ROOT_PATH="${PWD%$MCA_DIR_NAME/*}"
ROOT_PATH="${ROOT_PATH%/}"
CORDOVA_PATH="${CORDOVA_PATH:-$ROOT_PATH/$CORDOVA_DIR_NAME}"
MCA_PATH="${MCA_PATH:-$ROOT_PATH/$MCA_DIR_NAME}"

for x in cordova-js cordova-ios cordova-android; do
  FailIfNotExists "$CORDOVA_PATH/$x"
done
FailIfNotExists "$MCA_PATH/chrome-cordova"

# Fail if these aren't installed
type plugman >/dev/null 2>&1
type cordova >/dev/null 2>&1

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
read -n 1 -p "Symlink all your plugins? [y/n] " SHOULD_LINK
echo
read -n 1 -p "Also add chrome spec? [y/n] " SHOULD_ADD_SPEC
echo
echo "Starting..."
echo

################################################################################
# Create the project
#
set -x # Echo all commands

cordova create "$TARGET" com.google.cordova."$TARGET" "$TARGET"
cd "$TARGET"

cordova platform add android
cordova platform add ios

set +x # No more echo

################################################################################
# Install plugins
#
for PLUGIN_PATH in "$MCA_PATH/chrome-cordova/plugins/"*; do
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
# Install chrome spec
#
if [ "$SHOULD_ADD_SPEC" == "y" ]; then
  AddPlugin "$MCA_PATH/chrome-cordova/spec"
fi

################################################################################
# Massage the workspace
#
set -x # Echo all commands

cordova prepare
rm -rf app/www/spec app/www/spec.html app/www/js app/www/index.html app/www/css app/www/img
rm -rf platforms/ios/CordovaLib
"$CORDOVA_PATH/cordova-ios/bin/update_cordova_subproject" "platforms/ios/${TARGET}.xcodeproj"

set +x # No more echo

################################################################################
# Report results
#
echo
echo "Successfully created $TARGET!"
echo
echo "cd $TARGET"
echo "open platforms/ios/${TARGET}.xcodeproj"
