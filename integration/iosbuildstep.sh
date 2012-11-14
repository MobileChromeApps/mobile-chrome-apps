#!/bin/bash

SRC_WWW_PATH="${1-${PROJECT_DIR}/www}"
DST_WWW_PATH="$BUILT_PRODUCTS_DIR/$FULL_PRODUCT_NAME/www"
CRCDV_PATH="$(dirname $0)/.."

if [[ -z "$SRC_WWW_PATH" ]]; then
  echo 'Usage: iosbuildstep.sh "path/to/www"'
  exit 1
fi
if [[ ! -e "$SRC_WWW_PATH" ]]; then
  echo "Path does not exist: $SRC_WWW_PATH"
  exit 1
fi

rm -rf "$DST_WWW_PATH"
cp -RL "$SRC_WWW_PATH" "$DST_WWW_PATH"

cp "$CRCDV_PATH"/integration/chrome* "$DST_WWW_PATH"
cp "$CRCDV_PATH"/api/dist/chromeapi.js "$DST_WWW_PATH"
