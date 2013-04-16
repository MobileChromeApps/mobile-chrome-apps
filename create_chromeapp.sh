#!/bin/bash
# Copyright (c) 2013 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

# Running this script should create a working chrome-spec project.
set -e # Fail on errors

################################################################################
# Helpers
#
function SetStartPage {
    sed -i '' '
/access/ a\
\ \ \ \ <content src="chromeapp.html" />
' "$1"
}

function AddPlugin {
  echo cordova plugin add "$1"
  cordova plugin add "$1"

  if [ "$SHOULD_LINK" = "y" ]; then
    PLUGIN_TARGET_PATH="plugins/$(basename $1)"
    rm -rf "$PLUGIN_TARGET_PATH"
    ln -s "$1" "$PLUGIN_TARGET_PATH"
  fi
}

function UpdateForArc {
  TARGET=$1
  sed -i '' 's/CLANG_ENABLE_OBJC_ARC = NO/CLANG_ENABLE_OBJC_ARC = YES/' "platforms/ios/${TARGET}.xcodeproj/project.pbxproj"
}

################################################################################
# Set default paths
# Scripts expects to be run from a subdirectory of a mobile_chrome_apps, and expects structure to be as such:
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

echo Expecting path to exist: $CORDOVA_PATH
echo Expecting path to exist: $MCA_PATH

[ -d "$CORDOVA_PATH" ] || exit
[ -d "$MCA_PATH" ] || exit

if [ -n "$1" ]; then
  TARGET="$1"
else
  TARGET="ChromeSpec"
fi

################################################################################
# Script inputs
#
echo
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
set -vx # Echo all commands

cordova create "$TARGET" com.google.cordova."$TARGET" "$TARGET"
cd "$TARGET"

cordova platform add android
cordova platform add ios

set +vx # No more echo

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
set -vx # Echo all commands

cordova prepare
UpdateForArc "$TARGET"
SetStartPage "www/config.xml"
SetStartPage "platforms/android/res/xml/config.xml"
SetStartPage "platforms/ios/$TARGET/config.xml"
rm -rf www/spec www/spec.html www/js www/index.html www/css www/img
rm -rf platforms/ios/CordovaLib
"$CORDOVA_PATH/cordova-ios/bin/update_cordova_subproject" "platforms/ios/${TARGET}.xcodeproj"

set +vx # No more echo

################################################################################
# Report results
#
echo
echo "Successfully created $TARGET!"
echo
echo "cd $TARGET"
echo "open platforms/ios/${TARGET}.xcodeproj"
