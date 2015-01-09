#!/bin/bash

DIR_NAME=${1-ChromeSpec}
ORIG_DIR=$PWD
CCA_PATH=$(dirname $0)/../src/cca.js
SPEC_PATH=$(dirname $0)/../chrome-cordova/chrome-apps-api-tests
echo Creating spec at: $DIR_NAME
set -e
set -x
rm -rf $DIR_NAME
$CCA_PATH create $DIR_NAME --link-to=${SPEC_PATH}/www
cp $SPEC_PATH/debug-key.p12 $DIR_NAME
cp $SPEC_PATH/android-debug-keys.properties $DIR_NAME
cd $DIR_NAME
$CCA_PATH build android --link
cp $SPEC_PATH/build-extras.gradle platforms/android
