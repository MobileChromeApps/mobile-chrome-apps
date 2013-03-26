#!/bin/bash
# Copyright (c) 2013 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

# Running this script should create a working chrome-spec project.
set -e # Fail on errors

function SetStartPage {
    sed -i '' '
/access/ a\
\ \ \ \ <content src="chromeapp.html" />
' "$1"
}

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
CORDOVA_PATH="$ROOT_PATH/$CORDOVA_DIR_NAME"
MCA_PATH="$ROOT_PATH/$MCA_DIR_NAME"

echo Expecting: $CORDOVA_PATH
echo Expecting: $MCA_PATH

if [ -n "$1" ]; then
  TARGET="$1"
else
  TARGET="ChromeSpec"
fi

set -x # Echo all commands

cordova create "$TARGET" com.google.cordova."$TARGET" "$TARGET"
cd "$TARGET"
cordova platform add android
cordova platform add ios
SetStartPage www/config.xml
SetStartPage platforms/android/res/xml/config.xml
SetStartPage platforms/ios/ChromeSpec/config.xml
rm -rf www/spec www/spec.html www/js www/index.html www/css www/img
rm -rf platforms/ios/CordovaLib
"$CORDOVA_PATH/cordova-ios/bin/update_cordova_subproject" platforms/ios/ChromeSpec.xcodeproj

set +x # No more echo

for x in "$MCA_PATH/chrome-cordova/plugins/"* "$MCA_PATH/chrome-cordova/spec"; do
  read -n 1 -p "shall I add plugin: '$(basename $x)'? [y/n] " yn
  echo
  case $yn in
      [Yy])
        cordova plugin add "$x"
        ;;
      *)
        ;;
  esac
done

echo "Remember to update your cordova-js manually!"
