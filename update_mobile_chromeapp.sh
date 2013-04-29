#!/bin/bash
# Copyright (c) 2013 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

set -e # Fail on errors

################################################################################
# Helpers
#
function FailIfNotExists {
  if [[ ! -d "$1" ]]; then
    echo -n "Expected path does not exist: $1"
    exit 1
  fi
}

function AddAccessTag {
    sed -i '' '
/access/ a\
\ \ \ \ <access origin="chrome-extension://*" />
' "$1"
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

################################################################################
# Script
#
set -x # Echo all commands

cordova prepare

cp -f $CORDOVA_PATH/cordova-js/pkg/cordova.ios.js platforms/ios/www/cordova.js
cp -f $CORDOVA_PATH/cordova-js/pkg/cordova.android.js platforms/android/assets/www/cordova.js

AddAccessTag platforms/ios/*/config.xml
