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

# Change directory into new app, if necessary
#   - Depending on platform add above, may already be in app directory
if [ -d "$DIR_NAME" ]; then
  cd "$DIR_NAME"
fi

# Adding a platform above will have triggered prepare, and plugins added
# Look for any tests for the plugins found
echo "Look for test plugins..."

PLUGINS_ROOT="$PWD/plugins"
TEST_PLUGINS=();

for plugin in $PLUGINS_ROOT/*/; do
  echo "Check for tests in ${plugin}"
  pluginName="$(basename ${plugin})"
  if [[ "${pluginName}" != "org.chromium."* ]] && [[ "${pluginName}" != "cordova-plugin-chrome-apps"* ]]; then
    continue
  fi

  potential_tests_plugin_xml="${plugin}/tests/plugin.xml"

  if [ ! -f $potential_tests_plugin_xml ]; then
    continue
  fi

  echo "Found tests plugin for ${pluginName}"
  TEST_PLUGINS=(${TEST_PLUGINS[@]} "$(dirname $potential_tests_plugin_xml)")
done


if [ ${#TEST_PLUGINS[@]} -gt 0 ]; then
  # Add the necessary test framework plugins with the found test plugins
  echo "${#TEST_PLUGINS[@]} test plugins to be added"
  set -x
  $CCA_PATH plugin add --link "cordova-plugin-test-framework" "cordova-plugin-chrome-apps-test-framework" "${TEST_PLUGINS[@]}"
  set +x
fi
