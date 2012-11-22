#!/bin/bash
# Copyright (c) 2012 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

SRC_WWW_PATH="${1-${PROJECT_DIR}/www}"
DST_WWW_PATH="$BUILT_PRODUCTS_DIR/$FULL_PRODUCT_NAME/www"
CRCDV_PATH="$(dirname $0)/.."
SRC_JS_PATH="${2-${SRC_WWW_PATH}}"
ORIG_SRC_JS_PATH="$SRC_JS_PATH"

# If a directory was given, look for cordova*.js file within it.
if [[ -d "$ORIG_SRC_JS_PATH" ]]; then
  # Look for manually built cordova.js.
  SRC_JS_PATH="${ORIG_SRC_JS_PATH}/cordova.ios.js"
  # Look for versioned cordova.js.
  if [[ ! -e "$SRC_JS_PATH" ]]; then
    SRC_JS_PATH=$(ls "$ORIG_SRC_JS_PATH"/cordova-*.js)
  fi
fi

if [[ ! -e "$SRC_WWW_PATH" || ! -e "$SRC_JS_PATH" ]]; then
  if [[ ! -e "$SRC_WWW_PATH" ]]; then
    echo "Path does not exist: $SRC_WWW_PATH"
  else
    echo "Path does not contain cordova.js: $ORIG_SRC_JS_PATH"
  fi
  echo 'Usage: iosbuildstep.sh ["path/to/www"] ["path/to/cordova.js"]'
  echo '  "path/to/www" - defaults to the www within your project directory.'
  echo '  "path/to/cordova.js" - Default to value of "path/to/www".'
  echo '                       - This can be the directory containing the file'
  echo '                         or the full path.'
  exit 1
fi

# Start with a clean www.
rm -rf "$DST_WWW_PATH"
# Copy in their copy, resolving symlinks.
cp -RL "$SRC_WWW_PATH" "$DST_WWW_PATH"
# Add in the cordova.js file (renaming it if applicable).
cp "$SRC_JS_PATH" "$DST_WWW_PATH"/cordova.js
# Add in the chrome files.
cp "$CRCDV_PATH"/integration/chrome* "$DST_WWW_PATH"
cp "$CRCDV_PATH"/grunt_output/api/chromeapi.js "$DST_WWW_PATH"
