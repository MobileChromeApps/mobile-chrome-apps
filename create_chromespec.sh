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

set -x # Echo all commands

cordova create chromespec com.google.cordova.ChromeSpec ChromeSpec
cd chromespec
cordova platform add android
cordova platform add ios
for x in ../../chrome-cordova/plugins/*; do
  cordova plugin add "$x"
done
cordova plugin add "../../chrome-cordova/spec"
SetStartPage www/config.xml
SetStartPage platforms/android/res/xml/config.xml
SetStartPage platforms/ios/ChromeSpec/config.xml
rm -rf www/spec www/spec.html www/js www/index.html www/css www/img
rm -rf platforms/ios/CordovaLib
../../cordova-ios/bin/update_cordova_subproject platforms/ios/ChromeSpec.xcodeproj
