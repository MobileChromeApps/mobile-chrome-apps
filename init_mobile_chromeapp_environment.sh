#!/bin/bash
# Copyright (c) 2013 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

# Running this script should create a working chrome-spec project.
echo "You are setting up Mobile Chrome Apps."
echo "We will need your sudo password, so prompting for it now."
sudo true

set -e # Fail on errors
set -x # Echo all commands

# create the right directory structure
mkdir -p cordova
mkdir -p mobile_chrome_apps

# clone cordova projects
cd cordova
git clone https://git-wip-us.apache.org/repos/asf/cordova-ios.git
git clone https://git-wip-us.apache.org/repos/asf/cordova-android.git
git clone https://git-wip-us.apache.org/repos/asf/cordova-js.git
git clone https://git-wip-us.apache.org/repos/asf/cordova-plugman.git
git clone https://git-wip-us.apache.org/repos/asf/cordova-cli.git
cd ..

# clone cordova projects
cd mobile_chrome_apps
git clone https://github.com/MobileChromeApps/chrome-cordova.git
cd ..

# build cordova-js
cd cordova/cordova-js
jake
cd ../..

# install cordova-plugman
cd cordova/cordova-plugman
npm install
sudo npm link
cd ../..

# install cordova-cli
cd cordova/cordova-cli
git checkout future # TODO: remove once we merge back future branch
npm install
sudo npm link
npm link plugman
cd ../..

# link files
cd cordova/cordova-cli
rm -rf lib/cordova-*
ln -s $PWD/../cordova-ios lib/
ln -s $PWD/../cordova-android lib/
rm lib/cordova-ios/CordovaLib/cordova.ios.js
ln -s $PWD/../cordova-js/pkg/cordova.ios.js lib/cordova-ios/CordovaLib/
rm lib/cordova-android/framework/assets/js/cordova.android.js
ln -s $PWD/../cordova-js/pkg/cordova.android.js lib/cordova-android/framework/assets/js/
cd ../..

# quick test
which cordova
which plugman

set +x # No more echo

# rejoice
echo "Congratulations! You've successfully set up for Mobile Chrome Apps."
