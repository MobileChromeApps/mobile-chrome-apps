#!/bin/bash

if [[ "$0" = /* ]]; then
  SCRIPT_PATH="$(dirname $0)"
else
  SCRIPT_PATH="$PWD/$(dirname $0)"
fi
CCA_PATH="$SCRIPT_PATH/../src/cca.js"
SPEC_PATH="$SCRIPT_PATH/../chrome-cordova/chrome-apps-api-tests"
ANDROID=1
IOS=0

if [[ "$1" = "--ios" || "$2" = "--ios" ]]; then
  IOS=1
  ANDROID=0
fi
if [[ "$1" = "--android" || "$2" = "--android" ]]; then
  ANDROID=1
fi

if [[ "$1" != -* ]]; then
  DIR_NAME=${1-ChromeSpec}
elif [[ "$2" != -* ]]; then
  DIR_NAME=${2-ChromeSpec}
elif [[ "$3" != -* ]]; then
  DIR_NAME=${3-ChromeSpec}
fi

echo Creating spec at: $DIR_NAME
set -e
rm -rf $DIR_NAME
$CCA_PATH create $DIR_NAME --link-to=${SPEC_PATH}/www
if (( $IOS )); then
  set -x
  (cd $DIR_NAME && $CCA_PATH build ios --link)
  set +x
fi
if (( $ANDROID )); then
  set -x
  cp $SPEC_PATH/debug-key.p12 $DIR_NAME
  cp $SPEC_PATH/android-debug-keys.properties $DIR_NAME
  cd $DIR_NAME
  $CCA_PATH platform add android --link
  cp $SPEC_PATH/build-extras.gradle platforms/android
  set +x
fi
