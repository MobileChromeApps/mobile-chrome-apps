#!/bin/bash

if [[ "$0" = /* ]]; then
  SCRIPT_PATH="$(dirname $0)"
else
  SCRIPT_PATH="$PWD/$(dirname $0)"
fi
DIR_NAME=${1-ChromeSpec}
CCA_PATH="$SCRIPT_PATH/../src/cca.js"
SPEC_PATH="$SCRIPT_PATH/../chrome-cordova/chrome-apps-api-tests"
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
