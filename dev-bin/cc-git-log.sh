#!/bin/bash

if [[ $# != 1 ]]; then
  echo "Shows the history of the given path, working around chrome-cordova repo merge craziness."
  echo Usage: $0 path
fi

TARGET="$1"
ABS_PATH=$(cd $(dirname "$TARGET") && pwd)/$(basename "$TARGET")
MCA_ROOT=${ABS_PATH%/chrome-cordova/*}
REL_PATH=${ABS_PATH#*/chrome-cordova/}
TMP_FILE=/tmp/cc-git-log.output

if [[ "$MCA_ROOT" = "$ABS_PATH" ]]; then
  echo "Script works only with files within chrome-cordova".
  exit 1
fi

set -x
cd "${MCA_ROOT}"
git log --color=always -- "chrome-cordova/$REL_PATH" > "$TMP_FILE" || exit 1
git log --color=always ccdv_premerge -- "$REL_PATH" >> "$TMP_FILE" || exit 1
set +x

cat "$TMP_FILE" | less -R
rm "$TMP_FILE"

