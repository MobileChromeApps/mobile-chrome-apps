#!/bin/bash

if [[ "$0" = /* ]]; then
  SCRIPT_PATH="$(dirname $0)"
else
  SCRIPT_PATH="$PWD/$(dirname $0)"
fi
CCA_PATH="$SCRIPT_PATH/../src/cca.js"
SPEC_PATH="$SCRIPT_PATH/../chrome-cordova/chrome-apps-api-tests"
CCA_ROOT="$SCRIPT_PATH/.."
CCA_PLUGINS_ROOT="$SCRIPT_PATH/../../mobile-chrome-apps-plugins"

# Check for git
if ! git --version; then
    printf 'git is not installed (or not available on your PATH)' >&2
    exit 1
fi

GITCMD="status"
GITARGS=""
if [[ "$1" = "--diff" ]]; then
  GITCMD="diff"
elif [[ "$1" = "--diffs" ]]; then
  GITCMD="diff"
  GITARGS="--staged"
fi

# Show git status/diff inside each plugin directory/repo
for plugin in $(find $CCA_PLUGINS_ROOT -type d -maxdepth 1)
do
  pluginName="$(basename ${plugin})"
  if [ "${pluginName}" = "mobile-chrome-apps-plugins" ]; then
    continue
  fi

	echo "## Git $GITCMD for ${pluginName}"
  if [[ ${#GITARGS} -gt 0 ]]; then
    git -C "$plugin" "$GITCMD" "$GITARGS"
  else
    git -C "$plugin" "$GITCMD"
  fi
  echo ""
done
